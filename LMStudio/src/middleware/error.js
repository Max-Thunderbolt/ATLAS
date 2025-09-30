import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error("Unhandled error:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Default error response
  let statusCode = 500;
  let message = "Internal Server Error";
  let details = null;

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    details = err.details || err.message;
  } else if (err.name === "UnauthorizedError") {
    statusCode = 401;
    message = "Unauthorized";
  } else if (err.name === "ForbiddenError") {
    statusCode = 403;
    message = "Forbidden";
  } else if (err.name === "NotFoundError") {
    statusCode = 404;
    message = "Not Found";
  } else if (err.name === "ConflictError") {
    statusCode = 409;
    message = "Conflict";
  } else if (err.name === "TooManyRequestsError") {
    statusCode = 429;
    message = "Too Many Requests";
  } else if (err.name === "TimeoutError") {
    statusCode = 408;
    message = "Request Timeout";
  } else if (err.code === "ENOENT") {
    statusCode = 404;
    message = "File or directory not found";
  } else if (err.code === "EACCES") {
    statusCode = 403;
    message = "Permission denied";
  } else if (err.code === "EMFILE" || err.code === "ENFILE") {
    statusCode = 503;
    message = "Too many open files";
  } else if (err.code === "ENOSPC") {
    statusCode = 507;
    message = "Insufficient storage space";
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Internal Server Error";
    details = null;
  } else if (err.message) {
    message = err.message;
  }

  // Send error response
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  if (details) {
    errorResponse.details = details;
  }

  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message, statusCode = 500, details = null) => {
  return new AppError(message, statusCode, details);
};
