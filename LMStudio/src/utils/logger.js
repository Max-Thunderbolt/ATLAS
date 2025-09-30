import winston from "winston";
import { join } from "path";
import { mkdir } from "fs/promises";

// Ensure logs directory exists
const ensureLogsDir = async () => {
  try {
    await mkdir("logs", { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
};

// Initialize logger
const createLogger = () => {
  const logLevel = process.env.LOG_LEVEL || "info";
  const logFile = process.env.LOG_FILE || "logs/app.log";

  // Ensure logs directory exists
  ensureLogsDir();

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: "llm-tools-api" },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
      // File transport for errors
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // File transport for all logs
      new winston.transports.File({
        filename: logFile,
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
    ],
  });

  // Add request logging method
  logger.logRequest = (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      user: req.user?.id || "anonymous",
    };

    if (res.statusCode >= 400) {
      logger.warn("HTTP Request", logData);
    } else {
      logger.info("HTTP Request", logData);
    }
  };

  // Add tool execution logging method
  logger.logToolExecution = (
    toolName,
    parameters,
    result,
    duration,
    error = null
  ) => {
    const logData = {
      tool: toolName,
      parameters,
      duration: `${duration}ms`,
      success: !error,
      error: error?.message || null,
    };

    if (error) {
      logger.error("Tool Execution Failed", logData);
    } else {
      logger.info("Tool Execution Success", logData);
    }
  };

  return logger;
};

export const logger = createLogger();

// Export individual log methods for convenience
export const logInfo = (message, meta = {}) => logger.info(message, meta);
export const logError = (message, meta = {}) => logger.error(message, meta);
export const logWarn = (message, meta = {}) => logger.warn(message, meta);
export const logDebug = (message, meta = {}) => logger.debug(message, meta);
