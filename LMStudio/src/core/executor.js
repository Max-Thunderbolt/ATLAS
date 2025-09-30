import { logger } from "../utils/logger.js";
import { toolRegistry } from "../tools/registry.js";
import { v4 as uuidv4 } from "uuid";

export class ToolExecutor {
  constructor() {
    this.activeExecutions = new Map();
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_TOOLS) || 5;
    this.defaultTimeout = parseInt(process.env.TOOL_TIMEOUT) || 30000;
  }

  async execute(toolName, parameters, requestId = null) {
    const executionId = requestId || uuidv4();

    // Check if tool exists
    const tool = toolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    // Check if tool is available
    if (tool.status !== "available") {
      throw new Error(
        `Tool '${toolName}' is not available (status: ${tool.status})`
      );
    }

    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.maxConcurrent) {
      throw new Error("Maximum concurrent tool executions reached");
    }

    // Validate parameters
    this.validateParameters(tool, parameters);

    // Create execution context
    const execution = {
      id: executionId,
      tool: toolName,
      parameters,
      startTime: Date.now(),
      status: "running",
    };

    this.activeExecutions.set(executionId, execution);

    try {
      logger.info(`Starting tool execution: ${toolName}`, {
        executionId,
        parameters,
      });

      // Update tool usage stats
      tool.usageCount = (tool.usageCount || 0) + 1;
      tool.lastUsed = new Date().toISOString();

      // Execute tool with timeout
      const result = await this.executeWithTimeout(
        tool.handler(parameters),
        this.defaultTimeout,
        executionId
      );

      execution.status = "completed";
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      logger.info(`Tool execution completed: ${toolName}`, {
        executionId,
        duration: execution.duration,
      });

      return {
        success: true,
        result,
        executionId,
        duration: execution.duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      execution.status = "failed";
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error.message;

      logger.error(`Tool execution failed: ${toolName}`, {
        executionId,
        error: error.message,
        duration: execution.duration,
      });

      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  async executeWithTimeout(promise, timeout, executionId) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${timeout}ms`));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  validateParameters(tool, parameters) {
    if (!tool.parameters) {
      return; // No validation schema
    }

    const schema = tool.parameters;
    const errors = [];

    // Check required parameters
    if (schema.required) {
      for (const requiredParam of schema.required) {
        if (!(requiredParam in parameters)) {
          errors.push(`Missing required parameter: ${requiredParam}`);
        }
      }
    }

    // Check parameter types
    if (schema.properties) {
      for (const [paramName, paramSchema] of Object.entries(
        schema.properties
      )) {
        const value = parameters[paramName];

        if (value !== undefined) {
          const expectedType = paramSchema.type;
          const actualType = typeof value;

          if (expectedType === "object" && actualType !== "object") {
            errors.push(`Parameter '${paramName}' should be an object`);
          } else if (expectedType === "string" && actualType !== "string") {
            errors.push(`Parameter '${paramName}' should be a string`);
          } else if (expectedType === "number" && actualType !== "number") {
            errors.push(`Parameter '${paramName}' should be a number`);
          } else if (expectedType === "boolean" && actualType !== "boolean") {
            errors.push(`Parameter '${paramName}' should be a boolean`);
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Parameter validation failed: ${errors.join(", ")}`);
    }
  }

  getActiveExecutions() {
    return Array.from(this.activeExecutions.values());
  }

  getExecutionStatus(executionId) {
    return this.activeExecutions.get(executionId);
  }

  cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = "cancelled";
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  getStats() {
    return {
      activeExecutions: this.activeExecutions.size,
      maxConcurrent: this.maxConcurrent,
      totalTools: toolRegistry.getToolCount(),
      availableTools: toolRegistry
        .getAllTools()
        .filter((t) => t.status === "available").length,
    };
  }
}
