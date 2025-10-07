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
import { toolFormatter } from "./src/utils/toolFormatter.js";

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

app.post("/chat/completions", async (req, res) => {
  console.log("Chat completion request", req.body);

  // Initialize tool call accumulation map
  const accumulatedToolCalls = new Map();

  try {
    const {
      messages,
      model = "gemma-3-12b",
      tools = null,
      tool_choice = "auto",
    } = req.body;

    console.log("Messages", messages);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required",
      });
    }

    logger.info("Chat completion request", {
      messageCount: messages.length,
      hasTools: !!tools,
      model,
    });

    // Get available tools if not provided
    const availableTools =
      tools ||
      toolRegistry.getAllTools().map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

    // Set up Server-Sent Events for streaming
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Forward to LM Studio with streaming
    const lmStudioResponse = await fetch(
      "http://192.168.3.39:1234/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          tools: availableTools.length > 0 ? availableTools : undefined,
          tool_choice,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true, // Enable streaming
        }),
      }
    );

    if (!lmStudioResponse.ok) {
      throw new Error(
        `LM Studio error: ${lmStudioResponse.status} ${lmStudioResponse.statusText}`
      );
    }

    // Handle streaming response
    const reader = lmStudioResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        console.log("=== STREAMING DEBUG ===");
        console.log("LM Studio response status:", lmStudioResponse.status);
        console.log(
          "LM Studio response headers:",
          Object.fromEntries(lmStudioResponse.headers.entries())
        );
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line in buffer
        console.log("Raw chunk received:", buffer);
        console.log("Lines to process:", lines);

        for (const line of lines) {
          if (line.trim() === "") continue;

          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              res.write("data: [DONE]\n\n");
              res.end();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              console.log("Parsed data:", JSON.stringify(parsed, null, 2));

              // Handle tool calls
              if (parsed.choices?.[0]?.delta?.tool_calls) {
                console.log(
                  "Streaming content:",
                  parsed.choices[0].delta.content
                );
                res.write(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        delta: { content: parsed.choices[0].delta.content },
                      },
                    ],
                  })}\n\n`
                );
                const toolCalls = parsed.choices[0].delta.tool_calls;

                for (const toolCall of toolCalls) {
                  const callId = toolCall.id;

                  // If no ID, try to find the most recent tool call to accumulate arguments
                  if (!callId) {
                    console.log(
                      "Tool call with no ID, looking for existing call to accumulate:",
                      toolCall
                    );
                    console.log(
                      "Current accumulated calls:",
                      Array.from(accumulatedToolCalls.entries())
                    );

                    // Find the most recent tool call that has a name but incomplete arguments
                    let targetCallId = null;
                    for (const [
                      id,
                      accumulated,
                    ] of accumulatedToolCalls.entries()) {
                      if (
                        accumulated.function.name &&
                        (!accumulated.function.arguments ||
                          !accumulated.function.arguments.endsWith("}"))
                      ) {
                        targetCallId = id;
                        break;
                      }
                    }

                    if (targetCallId) {
                      console.log(
                        `Accumulating arguments for existing call ${targetCallId}`
                      );
                      const accumulated =
                        accumulatedToolCalls.get(targetCallId);
                      if (toolCall.function?.arguments) {
                        accumulated.function.arguments +=
                          toolCall.function.arguments;
                        console.log(
                          `Updated arguments for ${targetCallId}:`,
                          accumulated.function.arguments
                        );
                      }
                    } else {
                      console.log(
                        "No existing tool call found to accumulate arguments"
                      );
                    }
                    continue;
                  }

                  // Initialize the tool call if it doesn't exist
                  if (!accumulatedToolCalls.has(callId)) {
                    accumulatedToolCalls.set(callId, {
                      id: callId,
                      type: toolCall.type || "function",
                      function: {
                        name: "",
                        arguments: "",
                      },
                    });
                  }

                  const accumulated = accumulatedToolCalls.get(callId);
                  console.log(
                    "Accumulated tool calls:",
                    Array.from(accumulatedToolCalls.entries())
                  );

                  // Accumulate the function name and arguments
                  if (toolCall.function?.name) {
                    accumulated.function.name = toolCall.function.name;
                  }
                  if (toolCall.function?.arguments) {
                    accumulated.function.arguments +=
                      toolCall.function.arguments;
                  }

                  console.log(`Accumulating tool call ${callId}:`, {
                    name: accumulated.function.name,
                    arguments: accumulated.function.arguments,
                    isComplete:
                      accumulated.function.name &&
                      accumulated.function.arguments,
                  });
                }
              }

              // Check if tool calls are complete based on finish_reason
              if (parsed.choices?.[0]?.finish_reason === "tool_calls") {
                console.log(
                  "Tool calls completed, executing all accumulated calls"
                );
                console.log(
                  "All accumulated calls:",
                  Array.from(accumulatedToolCalls.entries())
                );

                // Clean up any invalid entries first
                for (const [
                  callId,
                  accumulated,
                ] of accumulatedToolCalls.entries()) {
                  if (!callId || !accumulated.function.name) {
                    console.log(`Removing invalid tool call entry: ${callId}`);
                    accumulatedToolCalls.delete(callId);
                  }
                }

                // Execute all accumulated tool calls
                for (const [
                  callId,
                  accumulated,
                ] of accumulatedToolCalls.entries()) {
                  console.log(`Checking tool call ${callId}:`, {
                    name: accumulated.function.name,
                    arguments: accumulated.function.arguments,
                    hasName: !!accumulated.function.name,
                    hasArguments: !!accumulated.function.arguments,
                  });

                  if (
                    accumulated.function.name &&
                    accumulated.function.arguments
                  ) {
                    try {
                      console.log(`Executing complete tool call ${callId}:`, {
                        name: accumulated.function.name,
                        arguments: accumulated.function.arguments,
                      });

                      // Parse arguments to validate JSON
                      let parsedArgs;
                      try {
                        parsedArgs = JSON.parse(accumulated.function.arguments);
                        console.log("Parsed arguments:", parsedArgs);
                      } catch (parseError) {
                        console.error(
                          "Failed to parse tool call arguments:",
                          parseError
                        );
                        console.log(
                          "Raw arguments:",
                          accumulated.function.arguments
                        );
                        throw new Error(
                          `Invalid JSON in tool call arguments: ${parseError.message}`
                        );
                      }

                      const executor = new ToolExecutor();
                      const result = await executor.execute(
                        accumulated.function.name,
                        parsedArgs,
                        callId
                      );

                      console.log(
                        `Tool call ${callId} executed successfully:`,
                        result
                      );

                      // Send the tool result back to the client immediately
                      res.write(
                        `data: ${JSON.stringify({
                          choices: [
                            {
                              delta: {
                                content: `Tool ${
                                  accumulated.function.name
                                } executed successfully. Result: ${JSON.stringify(
                                  result
                                )}`,
                              },
                            },
                          ],
                        })}\n\n`
                      );

                      // Send tool result back to LM Studio
                      const toolResultResponse = await fetch(
                        "http://192.168.3.39:1234/v1/chat/completions",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            model,
                            messages: [
                              ...messages,
                              {
                                role: "assistant",
                                content: "",
                                tool_calls: [accumulated],
                              },
                              {
                                role: "tool",
                                tool_call_id: callId,
                                content: JSON.stringify(result),
                              },
                            ],
                            temperature: 0.7,
                            max_tokens: 2048,
                            stream: true,
                          }),
                        }
                      );

                      if (!toolResultResponse.ok) {
                        throw new Error(
                          `Tool result request failed: ${toolResultResponse.status}`
                        );
                      }

                      // Stream the tool result response
                      const toolReader = toolResultResponse.body.getReader();
                      const toolDecoder = new TextDecoder();
                      let toolBuffer = "";

                      while (true) {
                        const { done: toolDone, value: toolValue } =
                          await toolReader.read();
                        if (toolDone) break;

                        toolBuffer += toolDecoder.decode(toolValue, {
                          stream: true,
                        });
                        const toolLines = toolBuffer.split("\n");
                        toolBuffer = toolLines.pop();

                        for (const toolLine of toolLines) {
                          if (toolLine.trim() === "") continue;
                          if (toolLine.startsWith("data: ")) {
                            const toolData = toolLine.slice(6);
                            if (toolData === "[DONE]") break;

                            try {
                              const toolParsed = JSON.parse(toolData);
                              if (toolParsed.choices?.[0]?.delta?.content) {
                                res.write(
                                  `data: ${JSON.stringify({
                                    choices: [
                                      {
                                        delta: {
                                          content:
                                            toolParsed.choices[0].delta.content,
                                        },
                                      },
                                    ],
                                  })}\n\n`
                                );
                              }
                            } catch (e) {
                              // Ignore parsing errors
                            }
                          }
                        }
                      }

                      // Remove the completed tool call from accumulation
                      accumulatedToolCalls.delete(callId);
                    } catch (error) {
                      logger.error("Tool execution failed", {
                        tool: accumulated.function.name,
                        callId: callId,
                        error: error.message,
                      });

                      // Remove the failed tool call from accumulation
                      accumulatedToolCalls.delete(callId);

                      // Send error result back to LM Studio
                      const errorResultResponse = await fetch(
                        "http://192.168.3.39:1234/v1/chat/completions",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            model,
                            messages: [
                              ...messages,
                              {
                                role: "assistant",
                                content: "",
                                tool_calls: [accumulated],
                              },
                              {
                                role: "tool",
                                tool_call_id: callId,
                                content: JSON.stringify({
                                  success: false,
                                  error: error.message,
                                }),
                              },
                            ],
                            temperature: 0.7,
                            max_tokens: 2048,
                            stream: true,
                          }),
                        }
                      );

                      if (errorResultResponse.ok) {
                        // Stream the error response
                        const errorReader =
                          errorResultResponse.body.getReader();
                        const errorDecoder = new TextDecoder();
                        let errorBuffer = "";

                        while (true) {
                          const { done: errorDone, value: errorValue } =
                            await errorReader.read();
                          if (errorDone) break;

                          errorBuffer += errorDecoder.decode(errorValue, {
                            stream: true,
                          });
                          const errorLines = errorBuffer.split("\n");
                          errorBuffer = errorLines.pop();

                          for (const errorLine of errorLines) {
                            if (errorLine.trim() === "") continue;
                            if (errorLine.startsWith("data: ")) {
                              const errorData = errorLine.slice(6);
                              if (errorData === "[DONE]") break;

                              try {
                                const errorParsed = JSON.parse(errorData);
                                if (errorParsed.choices?.[0]?.delta?.content) {
                                  res.write(
                                    `data: ${JSON.stringify({
                                      choices: [
                                        {
                                          delta: {
                                            content:
                                              errorParsed.choices[0].delta
                                                .content,
                                          },
                                        },
                                      ],
                                    })}\n\n`
                                  );
                                }
                              } catch (e) {
                                // Ignore parsing errors
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }

              // Handle regular content streaming
              if (parsed.choices?.[0]?.delta?.content) {
                // Stream regular content
                res.write(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        delta: { content: parsed.choices[0].delta.content },
                      },
                    ],
                  })}\n\n`
                );
              }
            } catch (e) {
              // Ignore parsing errors for malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    logger.error("Chat completion error:", error);
    res.write(
      `data: ${JSON.stringify({
        error: error.message,
      })}\n\n`
    );
    res.end();
  }
});

// Tool result formatting endpoint
app.post("/format-tool-result", async (req, res) => {
  try {
    const { toolName, result, options = {} } = req.body;

    if (!toolName || !result) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: toolName and result",
      });
    }

    logger.info(`Formatting tool result for: ${toolName}`);

    const formatted = toolFormatter.formatToolResult(toolName, result, options);

    res.json({
      success: true,
      formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Tool result formatting error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
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
  logger.info(
    `🛠️  Chat completion endpoint: http://localhost:${PORT}/chat/completions`
  );
});

export default app;
