import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Import tool modules
import { toolRegistry } from "./src/tools/registry.js";
import { ToolExecutor } from "./src/core/executor.js";
import { authMiddleware } from "./src/middleware/auth.js";
import { errorHandler } from "./src/middleware/error.js";
import { logger } from "./src/utils/logger.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date() + 2 * 60 * 60 * 1000,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Tool discovery endpoint
app.get("/tools", (req, res) => {
  try {
    const tools = toolRegistry.getAllTools();
    res.json({
      success: true,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        category: tool.category,
      })),
    });
  } catch (error) {
    logger.error("Error fetching tools:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tools" });
  }
});

// Tool execution endpoint
app.post("/execute", authMiddleware, async (req, res) => {
  try {
    const { tool, parameters, requestId } = req.body;

    if (!tool || !parameters) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: tool and parameters",
      });
    }

    logger.info(`Executing tool: ${tool}`, { requestId, parameters });

    const executor = new ToolExecutor();
    const result = await executor.execute(tool, parameters, requestId);

    res.json({
      success: true,
      result,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Tool execution error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId,
    });
  }
});

// Batch tool execution
app.post("/execute/batch", authMiddleware, async (req, res) => {
  try {
    const { tools, requestId } = req.body;

    if (!Array.isArray(tools)) {
      return res.status(400).json({
        success: false,
        error: "Tools must be an array",
      });
    }

    logger.info(`Executing batch of ${tools.length} tools`, { requestId });

    const executor = new ToolExecutor();
    const results = await Promise.allSettled(
      tools.map((tool) =>
        executor.execute(tool.name, tool.parameters, requestId)
      )
    );

    const responses = results.map((result, index) => ({
      tool: tools[index].name,
      success: result.status === "fulfilled",
      result: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason.message : null,
    }));

    res.json({
      success: true,
      results: responses,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Batch execution error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId,
    });
  }
});

// Tool status endpoint
app.get("/tools/:toolName/status", (req, res) => {
  try {
    const { toolName } = req.params;
    const tool = toolRegistry.getTool(toolName);

    if (!tool) {
      return res.status(404).json({
        success: false,
        error: "Tool not found",
      });
    }

    res.json({
      success: true,
      tool: {
        name: tool.name,
        status: tool.status || "available",
        lastUsed: tool.lastUsed,
        usageCount: tool.usageCount || 0,
      },
    });
  } catch (error) {
    logger.error("Error checking tool status:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to check tool status" });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 LLM Tools API server running on port ${PORT}`);
  logger.info(`📚 Available tools: ${toolRegistry.getToolCount()}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`🛠️  Tools endpoint: http://localhost:${PORT}/tools`);
});

export default app;
