package service

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/repository"
)

type AuthService struct {
	adminRepo *repository.AdminRepository
	jwtSecret string
}

func NewAuthService(adminRepo *repository.AdminRepository, jwtSecret string) *AuthService {
	return &AuthService{adminRepo: adminRepo, jwtSecret: jwtSecret}
}

func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest, storeID uint64) (*dto.LoginResponse, error) {
	admin, err := s.adminRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("internal error")
	}
	if admin == nil || !admin.IsActive {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Validate admin belongs to this store
	if admin.StoreID != storeID {
		return nil, errors.New("invalid credentials")
	}

	accessToken, err := s.generateToken(admin.ID, admin.StoreID, admin.Email, "access", 15*time.Minute)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	refreshToken, err := s.generateToken(admin.ID, admin.StoreID, admin.Email, "refresh", 7*24*time.Hour)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &dto.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Admin: dto.AdminInfo{
			ID:    admin.ID,
			Name:  admin.Name,
			Email: admin.Email,
		},
	}, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*dto.RefreshResponse, error) {
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	tokenType, _ := claims["type"].(string)
	if tokenType != "refresh" {
		return nil, errors.New("invalid token type")
	}

	adminID := uint64(claims["admin_id"].(float64))
	storeID := uint64(claims["store_id"].(float64))
	email, _ := claims["email"].(string)

	admin, err := s.adminRepo.FindByID(ctx, adminID)
	if err != nil || admin == nil || !admin.IsActive {
		return nil, errors.New("admin not found")
	}

	newAccessToken, err := s.generateToken(adminID, storeID, email, "access", 15*time.Minute)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	newRefreshToken, err := s.generateToken(adminID, storeID, email, "refresh", 7*24*time.Hour)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &dto.RefreshResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}, nil
}

func (s *AuthService) generateToken(adminID, storeID uint64, email, tokenType string, duration time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"admin_id": adminID,
		"store_id": storeID,
		"email":    email,
		"type":     tokenType,
		"exp":      time.Now().Add(duration).Unix(),
		"iat":      time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
