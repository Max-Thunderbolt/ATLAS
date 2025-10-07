import { logger } from "./logger.js";

/**
 * Tool Output Formatter
 * Formats tool execution results in a user-friendly way similar to GPT/Gemini interfaces
 */
export class ToolFormatter {
  constructor() {
    this.formatters = new Map();
    this.setupDefaultFormatters();
  }

  /**
   * Setup default formatters for different tool types
   */
  setupDefaultFormatters() {
    // Web search formatter
    this.formatters.set("web_search", this.formatWebSearch.bind(this));

    // File operations formatters
    this.formatters.set("read_file", this.formatFileOperation.bind(this));
    this.formatters.set("write_file", this.formatFileOperation.bind(this));
    this.formatters.set(
      "list_directory",
      this.formatDirectoryListing.bind(this)
    );

    // System operations formatters
    this.formatters.set("get_system_info", this.formatSystemInfo.bind(this));
    this.formatters.set(
      "execute_command",
      this.formatCommandExecution.bind(this)
    );

    // Data processing formatters
    this.formatters.set("process_json", this.formatJsonProcessing.bind(this));
    this.formatters.set("calculate", this.formatCalculation.bind(this));

    // URL operations formatters
    this.formatters.set("fetch_url", this.formatUrlFetch.bind(this));
  }

  /**
   * Format tool execution result for display
   * @param {string} toolName - Name of the tool
   * @param {Object} result - Tool execution result
   * @param {Object} options - Formatting options
   * @returns {Object} Formatted result with display content
   */
  formatToolResult(toolName, result, options = {}) {
    const {
      includeMetadata = true,
      includeRawResult = false,
      maxResults = 10,
      showSuccessStatus = true,
    } = options;

    try {
      // Get specific formatter or use generic one
      const formatter =
        this.formatters.get(toolName) || this.formatGeneric.bind(this);

      const formatted = formatter(result, options);

      return {
        toolName,
        success: result.success !== false,
        displayContent: formatted.displayContent,
        summary: formatted.summary,
        metadata: includeMetadata
          ? this.extractMetadata(result, toolName)
          : null,
        rawResult: includeRawResult ? result : null,
        formattedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Tool formatting error", { toolName, error: error.message });
      return this.formatError(toolName, result, error);
    }
  }

  /**
   * Format web search results
   */
  formatWebSearch(result, options = {}) {
    const { maxResults = 5 } = options;

    if (!result.success) {
      return {
        displayContent: `❌ **Search Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "Web search failed",
      };
    }

    // Handle nested result structure
    const searchData = result.result || result;
    const { query, results = [], count = 0, source } = searchData;

    let content = `🔍 **Web Search Results**\n\n`;
    content += `**Query:** "${query}"\n`;
    content += `**Found:** ${count} results\n`;
    if (source) content += `**Source:** ${source}\n\n`;

    if (results.length === 0) {
      content += "No results found.";
    } else {
      content += "**Results:**\n\n";

      results.slice(0, maxResults).forEach((item, index) => {
        content += `${index + 1}. **${item.title}**\n`;
        content += `   🔗 [${item.url}](${item.url})\n`;
        if (item.snippet) {
          content += `   📝 ${item.snippet}\n`;
        }
        if (item.source) {
          content += `   📊 Source: ${item.source}\n`;
        }
        content += `\n`;
      });

      if (results.length > maxResults) {
        content += `*... and ${results.length - maxResults} more results*\n`;
      }
    }

    return {
      displayContent: content,
      summary: `Found ${count} results for "${query}"`,
    };
  }

  /**
   * Format file operations
   */
  formatFileOperation(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **File Operation Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "File operation failed",
      };
    }

    const { path, size, content, message } = result;

    let content_text = `📁 **File Operation Successful**\n\n`;
    content_text += `**Path:** \`${path}\`\n`;

    if (size !== undefined) {
      content_text += `**Size:** ${this.formatBytes(size)}\n`;
    }

    if (message) {
      content_text += `**Message:** ${message}\n`;
    }

    if (content && content.length > 0) {
      const preview =
        content.length > 200 ? content.substring(0, 200) + "..." : content;
      content_text += `\n**Content Preview:**\n\`\`\`\n${preview}\n\`\`\``;
    }

    return {
      displayContent: content_text,
      summary: `File operation completed for ${path}`,
    };
  }

  /**
   * Format directory listing
   */
  formatDirectoryListing(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **Directory Listing Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "Directory listing failed",
      };
    }

    const { path, items = [], count = 0 } = result;

    let content_text = `📂 **Directory Contents**\n\n`;
    content_text += `**Path:** \`${path}\`\n`;
    content_text += `**Items:** ${count}\n\n`;

    if (items.length === 0) {
      content_text += "Directory is empty.";
    } else {
      content_text += "**Contents:**\n\n";

      items.forEach((item, index) => {
        const icon = item.isDirectory ? "📁" : "📄";
        const size = item.isDirectory
          ? ""
          : ` (${this.formatBytes(item.size)})`;
        const modified = new Date(item.modified).toLocaleDateString();

        content_text += `${icon} **${item.name}**${size}\n`;
        content_text += `   📅 Modified: ${modified}\n`;
        if (index < items.length - 1) content_text += `\n`;
      });
    }

    return {
      displayContent: content_text,
      summary: `Listed ${count} items in ${path}`,
    };
  }

  /**
   * Format system information
   */
  formatSystemInfo(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **System Info Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "System info failed",
      };
    }

    const { data } = result;

    let content_text = `💻 **System Information**\n\n`;

    if (data.platform) {
      content_text += `**Platform:** ${data.platform}\n`;
    }

    if (data.nodeVersion) {
      content_text += `**Node Version:** ${data.nodeVersion}\n`;
    }

    if (data.uptime) {
      content_text += `**Uptime:** ${this.formatUptime(data.uptime)}\n`;
    }

    if (data.memory) {
      content_text += `\n**Memory Usage:**\n`;
      content_text += `- **RSS:** ${this.formatBytes(data.memory.rss)}\n`;
      content_text += `- **Heap Used:** ${this.formatBytes(
        data.memory.heapUsed
      )}\n`;
      content_text += `- **Heap Total:** ${this.formatBytes(
        data.memory.heapTotal
      )}\n`;
      content_text += `- **External:** ${this.formatBytes(
        data.memory.external
      )}\n`;
    }

    return {
      displayContent: content_text,
      summary: "System information retrieved",
    };
  }

  /**
   * Format command execution
   */
  formatCommandExecution(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **Command Execution Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "Command execution failed",
      };
    }

    const { command, output, exitCode } = result;

    let content_text = `⚡ **Command Executed**\n\n`;
    content_text += `**Command:** \`${command}\`\n`;
    content_text += `**Exit Code:** ${exitCode}\n\n`;
    content_text += `**Output:**\n\`\`\`\n${output}\n\`\`\``;

    return {
      displayContent: content_text,
      summary: `Command executed with exit code ${exitCode}`,
    };
  }

  /**
   * Format JSON processing
   */
  formatJsonProcessing(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **JSON Processing Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "JSON processing failed",
      };
    }

    const { result: processedResult, valid } = result;

    let content_text = `📋 **JSON Processing**\n\n`;

    if (valid !== undefined) {
      content_text += `**Valid JSON:** ${valid ? "✅ Yes" : "❌ No"}\n`;
    }

    if (processedResult) {
      const preview = JSON.stringify(processedResult, null, 2);
      const displayPreview =
        preview.length > 500 ? preview.substring(0, 500) + "..." : preview;
      content_text += `\n**Result:**\n\`\`\`json\n${displayPreview}\n\`\`\``;
    }

    return {
      displayContent: content_text,
      summary: "JSON processing completed",
    };
  }

  /**
   * Format calculation results
   */
  formatCalculation(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **Calculation Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "Calculation failed",
      };
    }

    const { expression, result: calculationResult } = result;

    let content_text = `🧮 **Calculation**\n\n`;
    content_text += `**Expression:** \`${expression}\`\n`;
    content_text += `**Result:** **${calculationResult}**`;

    return {
      displayContent: content_text,
      summary: `${expression} = ${calculationResult}`,
    };
  }

  /**
   * Format URL fetch results
   */
  formatUrlFetch(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **URL Fetch Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "URL fetch failed",
      };
    }

    const { url, status, statusText, data, size } = result;

    let content_text = `🌐 **URL Fetch**\n\n`;
    content_text += `**URL:** [${url}](${url})\n`;
    content_text += `**Status:** ${status} ${statusText}\n`;

    if (size) {
      content_text += `**Size:** ${this.formatBytes(size)}\n`;
    }

    if (data) {
      const preview =
        typeof data === "string"
          ? data.length > 300
            ? data.substring(0, 300) + "..."
            : data
          : JSON.stringify(data, null, 2).substring(0, 300) + "...";

      content_text += `\n**Content Preview:**\n\`\`\`\n${preview}\n\`\`\``;
    }

    return {
      displayContent: content_text,
      summary: `Fetched ${url} (${status})`,
    };
  }

  /**
   * Generic formatter for unknown tools
   */
  formatGeneric(result, options = {}) {
    if (!result.success) {
      return {
        displayContent: `❌ **Tool Execution Failed**\n\n${
          result.error || "Unknown error occurred"
        }`,
        summary: "Tool execution failed",
      };
    }

    let content_text = `✅ **Tool Execution Successful**\n\n`;

    // Try to format the result nicely
    if (typeof result === "object") {
      const formatted = JSON.stringify(result, null, 2);
      const preview =
        formatted.length > 500
          ? formatted.substring(0, 500) + "..."
          : formatted;
      content_text += `**Result:**\n\`\`\`json\n${preview}\n\`\`\``;
    } else {
      content_text += `**Result:** ${result}`;
    }

    return {
      displayContent: content_text,
      summary: "Tool executed successfully",
    };
  }

  /**
   * Format error results
   */
  formatError(toolName, result, error) {
    return {
      toolName,
      success: false,
      displayContent: `❌ **Tool Execution Error**\n\n**Tool:** ${toolName}\n**Error:** ${
        error.message
      }\n\n**Raw Result:**\n\`\`\`json\n${JSON.stringify(
        result,
        null,
        2
      )}\n\`\`\``,
      summary: `Error executing ${toolName}`,
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      formattedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract metadata from result
   */
  extractMetadata(result, toolName) {
    const metadata = {
      toolName,
      timestamp: new Date().toISOString(),
    };

    if (result.duration) metadata.duration = `${result.duration}ms`;
    if (result.executionId) metadata.executionId = result.executionId;
    if (result.searchTime)
      metadata.searchTime = new Date(result.searchTime).toISOString();
    if (result.source) metadata.source = result.source;
    if (result.count) metadata.count = result.count;

    return metadata;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Format uptime to human readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;

    return result.trim();
  }

  /**
   * Register a custom formatter for a specific tool
   */
  registerFormatter(toolName, formatter) {
    this.formatters.set(toolName, formatter);
  }

  /**
   * Get all registered formatters
   */
  getFormatters() {
    return Array.from(this.formatters.keys());
  }
}

// Export singleton instance
export const toolFormatter = new ToolFormatter();

// Export individual formatting functions for convenience
export const formatToolResult = (toolName, result, options) =>
  toolFormatter.formatToolResult(toolName, result, options);

export const formatWebSearch = (result, options) =>
  toolFormatter.formatWebSearch(result, options);

export const formatFileOperation = (result, options) =>
  toolFormatter.formatFileOperation(result, options);
