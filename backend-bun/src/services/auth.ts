import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { config } from "../config";
import { findAdminByEmail, findAdminByID } from "../repositories/admin";
import type { LoginRequest, LoginResponse, RefreshResponse } from "../types";

const secret = new TextEncoder().encode(config.jwtSecret);

interface TokenClaims extends JWTPayload {
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
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, secret);
  return payload as TokenClaims;
}

export async function login(req: LoginRequest, storeId: number): Promise<LoginResponse> {
  const admin = await findAdminByEmail(req.email);
  if (!admin) {
    throw new Error("Invalid credentials");
  }
  if (!admin.is_active) {
    throw new Error("Account is inactive");
  }
  if (admin.store_id !== storeId) {
    throw new Error("Invalid credentials");
  }

  const valid = await Bun.password.verify(req.password, admin.password_hash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = await generateToken(admin.id, admin.store_id, admin.email, "access", "15m");
  const refreshToken = await generateToken(admin.id, admin.store_id, admin.email, "refresh", "7d");

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const claims = await verifyToken(refreshToken);
  if (claims.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  const admin = await findAdminByID(claims.admin_id);
  if (!admin || !admin.is_active) {
    throw new Error("Admin not found or inactive");
  }

  const newAccess = await generateToken(admin.id, admin.store_id, admin.email, "access", "15m");
  const newRefresh = await generateToken(admin.id, admin.store_id, admin.email, "refresh", "7d");

  return { access_token: newAccess, refresh_token: newRefresh };
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}
