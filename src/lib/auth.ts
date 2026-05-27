/**
 * API Authentication & Authorization Middleware
 * Use this to protect sensitive API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

export interface AuthContext {
  user?: {
    id: string;
    email?: string;
    role?: "admin" | "user";
  };
  isAuthenticated: boolean;
}

const CONTEXT = "AUTH";

/**
 * Get auth token from request
 * Supports: Authorization header (Bearer token)
 */
export const getAuthToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7); // Remove "Bearer "
};

/**
 * Verify JWT token (basic implementation)
 * Replace with real JWT verification (jsonwebtoken package)
 */
export const verifyToken = async (token: string): Promise<AuthContext | null> => {
  try {
    // TODO: Implement real JWT verification
    // For now, just check if token exists and is not expired
    if (!token || token.length < 20) {
      return null;
    }

    // Placeholder: In production, use jsonwebtoken.verify()
    logger.debug(CONTEXT, "Token verification (placeholder)");

    return {
      isAuthenticated: true,
      user: {
        id: "user_1",
        email: "user@example.com",
        role: "admin",
      },
    };
  } catch (error) {
    logger.warn(CONTEXT, "Token verification failed", error as Error);
    return null;
  }
};

/**
 * Middleware: Check if request is authenticated
 */
export const requireAuth = async (req: NextRequest): Promise<NextResponse | null> => {
  const token = getAuthToken(req);

  if (!token) {
    logger.warn(CONTEXT, "Missing authentication token");
    return NextResponse.json(
      { error: "Authentification requise" },
      { status: 401 }
    );
  }

  const auth = await verifyToken(token);

  if (!auth?.isAuthenticated) {
    logger.warn(CONTEXT, "Invalid or expired token");
    return NextResponse.json(
      { error: "Token invalide ou expiré" },
      { status: 403 }
    );
  }

  return null; // Allow request to proceed
};

/**
 * Middleware: Check if user has required role
 */
export const requireRole = (requiredRole: "admin" | "user") => {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const token = getAuthToken(req);

    if (!token) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const auth = await verifyToken(token);

    if (!auth?.isAuthenticated || !auth.user) {
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 403 }
      );
    }

    const userRole = auth.user.role || "user";

    if (requiredRole === "admin" && userRole !== "admin") {
      logger.warn(CONTEXT, "Insufficient permissions", {
        userRole,
        requiredRole,
      });
      return NextResponse.json(
        { error: "Accès refusé (admin requis)" },
        { status: 403 }
      );
    }

    return null; // Allow request to proceed
  };
};

/**
 * Rate limiting helper (simple implementation)
 * For production, use Redis or dedicated service
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean => {
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count >= limit) {
    logger.warn(CONTEXT, "Rate limit exceeded", { identifier });
    return false;
  }

  entry.count++;
  return true;
};
