import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

export const authMiddleware = (req, res, next) => {
  try {
    // Check for API key in header
    const apiKey = req.headers["x-api-key"];
    const authHeader = req.headers.authorization;

    // API Key authentication
    if (apiKey) {
      const validApiKey = process.env.API_KEY;
      if (!validApiKey) {
        logger.warn("API_KEY not configured in environment");
        return res.status(500).json({
          success: false,
          error: "API authentication not configured",
        });
      }

      if (apiKey === validApiKey) {
        req.user = { type: "api_key", authenticated: true };
        return next();
      } else {
        return res.status(401).json({
          success: false,
          error: "Invalid API key",
        });
      }
    }

    // JWT authentication
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        logger.warn("JWT_SECRET not configured in environment");
        return res.status(500).json({
          success: false,
          error: "JWT authentication not configured",
        });
      }

      try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = { ...decoded, type: "jwt", authenticated: true };
        return next();
      } catch (jwtError) {
        logger.warn("JWT verification failed:", jwtError.message);
        return res.status(401).json({
          success: false,
          error: "Invalid or expired token",
        });
      }
    }

    // No authentication provided
    return res.status(401).json({
      success: false,
      error: "Authentication required. Provide API key or JWT token.",
    });
  } catch (error) {
    logger.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication error",
    });
  }
};

export const optionalAuthMiddleware = (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const authHeader = req.headers.authorization;

    if (apiKey && process.env.API_KEY && apiKey === process.env.API_KEY) {
      req.user = { type: "api_key", authenticated: true };
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (jwtSecret) {
        try {
          const decoded = jwt.verify(token, jwtSecret);
          req.user = { ...decoded, type: "jwt", authenticated: true };
        } catch (jwtError) {
          // Token invalid, but continue without authentication
          req.user = { authenticated: false };
        }
      }
    } else {
      req.user = { authenticated: false };
    }

    next();
  } catch (error) {
    logger.error("Optional auth middleware error:", error);
    req.user = { authenticated: false };
    next();
  }
};

export const generateToken = (payload, expiresIn = "24h") => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  return jwt.sign(payload, jwtSecret, { expiresIn });
};

export const verifyToken = (token) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  return jwt.verify(token, jwtSecret);
};
