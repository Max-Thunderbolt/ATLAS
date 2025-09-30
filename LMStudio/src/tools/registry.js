import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.categories = new Map();
    this.loadBuiltInTools();
  }

  // Load built-in tools
  loadBuiltInTools() {
    // File Operations
    this.registerTool({
      name: "read_file",
      description: "Read contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" },
          encoding: {
            type: "string",
            description: "File encoding (default: utf8)",
          },
        },
        required: ["path"],
      },
      category: "file_operations",
      handler: this.readFileHandler.bind(this),
    });

    this.registerTool({
      name: "write_file",
      description: "Write content to a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to write" },
          content: { type: "string", description: "Content to write" },
          encoding: {
            type: "string",
            description: "File encoding (default: utf8)",
          },
        },
        required: ["path", "content"],
      },
      category: "file_operations",
      handler: this.writeFileHandler.bind(this),
    });

    this.registerTool({
      name: "list_directory",
      description: "List files and directories in a path",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list" },
          recursive: {
            type: "boolean",
            description: "List recursively (default: false)",
          },
        },
        required: ["path"],
      },
      category: "file_operations",
      handler: this.listDirectoryHandler.bind(this),
    });

    // Web Operations
    this.registerTool({
      name: "web_search",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          num_results: {
            type: "number",
            description: "Number of results (default: 5)",
          },
        },
        required: ["query"],
      },
      category: "web_operations",
      handler: this.webSearchHandler.bind(this),
    });

    this.registerTool({
      name: "fetch_url",
      description: "Fetch content from a URL",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch" },
          method: { type: "string", description: "HTTP method (default: GET)" },
          headers: { type: "object", description: "HTTP headers" },
        },
        required: ["url"],
      },
      category: "web_operations",
      handler: this.fetchUrlHandler.bind(this),
    });

    // Data Processing
    this.registerTool({
      name: "process_json",
      description: "Process and manipulate JSON data",
      parameters: {
        type: "object",
        properties: {
          data: { type: "object", description: "JSON data to process" },
          operation: {
            type: "string",
            description: "Operation to perform (parse, stringify, validate)",
          },
        },
        required: ["data", "operation"],
      },
      category: "data_processing",
      handler: this.processJsonHandler.bind(this),
    });

    this.registerTool({
      name: "calculate",
      description: "Perform mathematical calculations",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression to evaluate",
          },
        },
        required: ["expression"],
      },
      category: "data_processing",
      handler: this.calculateHandler.bind(this),
    });

    // System Operations
    this.registerTool({
      name: "get_system_info",
      description: "Get system information",
      parameters: {
        type: "object",
        properties: {
          info_type: {
            type: "string",
            description: "Type of info (memory, cpu, disk, all)",
          },
        },
      },
      category: "system_operations",
      handler: this.getSystemInfoHandler.bind(this),
    });

    this.registerTool({
      name: "execute_command",
      description: "Execute a system command (use with caution)",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Command to execute" },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 30000)",
          },
        },
        required: ["command"],
      },
      category: "system_operations",
      handler: this.executeCommandHandler.bind(this),
    });
  }

  registerTool(tool) {
    if (!tool.name || !tool.handler) {
      throw new Error("Tool must have name and handler");
    }

    tool.status = "available";
    tool.usageCount = 0;
    tool.lastUsed = null;
    tool.createdAt = new Date().toISOString();

    this.tools.set(tool.name, tool);

    // Add to category
    if (tool.category) {
      if (!this.categories.has(tool.category)) {
        this.categories.set(tool.category, []);
      }
      this.categories.get(tool.category).push(tool.name);
    }
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category) {
    const toolNames = this.categories.get(category) || [];
    return toolNames.map((name) => this.tools.get(name));
  }

  getToolCount() {
    return this.tools.size;
  }

  getCategories() {
    return Array.from(this.categories.keys());
  }

  // Tool Handlers
  async readFileHandler(parameters) {
    const { path, encoding = "utf8" } = parameters;
    const content = await readFile(path, encoding);
    return {
      success: true,
      content,
      size: content.length,
      path,
    };
  }

  async writeFileHandler(parameters) {
    const { path, content, encoding = "utf8" } = parameters;
    await writeFile(path, content, encoding);
    return {
      success: true,
      message: "File written successfully",
      path,
      size: content.length,
    };
  }

  async listDirectoryHandler(parameters) {
    const { path, recursive = false } = parameters;
    const items = await readdir(path);
    const result = [];

    for (const item of items) {
      const itemPath = join(path, item);
      const stats = await stat(itemPath);
      result.push({
        name: item,
        path: itemPath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
      });
    }

    return {
      success: true,
      path,
      items: result,
      count: result.length,
    };
  }

  async webSearchHandler(parameters) {
    const { query, num_results = 5 } = parameters;
    // This is a placeholder - you'd integrate with a real search API
    return {
      success: true,
      query,
      results: [
        {
          title: `Search results for: ${query}`,
          url: "https://example.com",
          snippet: "This is a placeholder search result...",
        },
      ],
      count: 1,
    };
  }

  async fetchUrlHandler(parameters) {
    const { url, method = "GET", headers = {} } = parameters;
    // This is a placeholder - you'd use axios or fetch
    return {
      success: true,
      url,
      method,
      status: 200,
      content: "This is a placeholder response...",
    };
  }

  async processJsonHandler(parameters) {
    const { data, operation } = parameters;

    switch (operation) {
      case "parse":
        return { success: true, result: JSON.parse(data) };
      case "stringify":
        return { success: true, result: JSON.stringify(data, null, 2) };
      case "validate":
        try {
          JSON.parse(data);
          return { success: true, valid: true };
        } catch (error) {
          return { success: true, valid: false, error: error.message };
        }
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async calculateHandler(parameters) {
    const { expression } = parameters;
    // This is a placeholder - you'd use a safe math evaluation library
    try {
      // For security, you'd want to use a safe math parser
      const result = eval(expression); // DON'T use eval in production!
      return {
        success: true,
        expression,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getSystemInfoHandler(parameters) {
    const { info_type = "all" } = parameters;

    const info = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
    };

    if (info_type === "all" || info_type === "memory") {
      info.memory = process.memoryUsage();
    }

    return {
      success: true,
      info_type,
      data: info,
    };
  }

  async executeCommandHandler(parameters) {
    const { command, timeout = 30000 } = parameters;
    // This is a placeholder - you'd use child_process.exec
    return {
      success: true,
      command,
      output: "Command execution placeholder",
      exitCode: 0,
    };
  }
}

export const toolRegistry = new ToolRegistry();
