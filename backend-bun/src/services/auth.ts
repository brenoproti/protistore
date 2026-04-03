import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { config } from "../config";
import { findAdminByEmail, findAdminByID } from "../repositories/admin";
import { isTokenRevoked, revokeToken, cleanupExpiredTokens } from "../repositories/revokedToken";
import type { LoginRequest, LoginResponse, RefreshResponse } from "../types";

const secret = new TextEncoder().encode(config.jwtSecret);

export interface TokenClaims extends JWTPayload {
  admin_id: number;
  store_id: number;
  email: string;
  type: "access" | "refresh";
}

async function generateToken(
  adminId: number,
  storeId: number,
  email: string,
  type: "access" | "refresh",
  expiresIn: string
): Promise<string> {
  return new SignJWT({ admin_id: adminId, store_id: storeId, email, type })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, secret);
  return payload as TokenClaims;
}

// Cleanup expired revoked tokens periodically (every hour)
const tokenCleanupInterval = setInterval(() => {
  cleanupExpiredTokens().catch(() => {});
}, 60 * 60 * 1000);

export function stopTokenCleanup() {
  clearInterval(tokenCleanupInterval);
}

export async function login(req: LoginRequest, storeId: number): Promise<LoginResponse> {
  const admin = await findAdminByEmail(req.email, storeId);
  if (!admin) {
    throw new Error("Invalid credentials");
  }
  if (!admin.is_active) {
    throw new Error("Account is inactive");
  }

  const valid = await Bun.password.verify(req.password, admin.password_hash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = await generateToken(admin.id, admin.store_id, admin.email, "access", "1h");
  const refreshToken = await generateToken(admin.id, admin.store_id, admin.email, "refresh", "7d");

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };
}

export async function refresh(refreshToken: string, storeId: number): Promise<RefreshResponse> {
  const claims = await verifyToken(refreshToken);
  if (claims.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  // Cross-tenant validation
  if (claims.store_id !== storeId) {
    throw new Error("Invalid credentials");
  }

  // Check if token has been revoked
  if (claims.jti && (await isTokenRevoked(claims.jti))) {
    throw new Error("Token has been revoked");
  }

  const admin = await findAdminByID(claims.admin_id);
  if (!admin || !admin.is_active) {
    throw new Error("Admin not found or inactive");
  }

  // Revoke the old refresh token (rotation)
  if (claims.jti && claims.exp) {
    await revokeToken(claims.jti, claims.admin_id, new Date(claims.exp * 1000));
  }

  const newAccess = await generateToken(admin.id, admin.store_id, admin.email, "access", "1h");
  const newRefresh = await generateToken(admin.id, admin.store_id, admin.email, "refresh", "7d");

  return { access_token: newAccess, refresh_token: newRefresh };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const claims = await verifyToken(refreshToken);
    if (claims.jti && claims.exp) {
      await revokeToken(claims.jti, claims.admin_id, new Date(claims.exp * 1000));
    }
  } catch {
    // Token already invalid or expired — that's fine for logout
  }
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}
