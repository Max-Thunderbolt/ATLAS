import axios from "axios";
import { logger } from "../utils/logger.js";

export class WebTools {
  constructor() {
    this.defaultTimeout = 30000;
    this.userAgent = "LLM-Tools-API/1.0.0";
  }

  async searchWeb(query, options = {}) {
    const {
      numResults = 5,
      language = "en",
      region = "us",
      safeSearch = "moderate",
    } = options;

    try {
      // This is a placeholder implementation
      // In a real implementation, you'd integrate with Google Custom Search API
      // or another search service

      logger.info("Web search requested", { query, numResults });

      // Simulate search results
      const results = Array.from({ length: numResults }, (_, i) => ({
        title: `Search Result ${i + 1} for "${query}"`,
        url: `https://example.com/result-${i + 1}`,
        snippet: `This is a sample search result for the query "${query}". Result ${
          i + 1
        } contains relevant information about the topic.`,
        rank: i + 1,
      }));

      return {
        success: true,
        query,
        results,
        totalResults: results.length,
        searchTime: Math.random() * 1000 + 100, // Simulate search time
      };
    } catch (error) {
      logger.error("Web search failed", { query, error: error.message });
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  async fetchUrl(url, options = {}) {
    const {
      method = "GET",
      headers = {},
      timeout = this.defaultTimeout,
      followRedirects = true,
      maxRedirects = 5,
    } = options;

    try {
      logger.info("Fetching URL", { url, method });

      const response = await axios({
        method,
        url,
        headers: {
          "User-Agent": this.userAgent,
          ...headers,
        },
        timeout,
        maxRedirects: followRedirects ? maxRedirects : 0,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      return {
        success: true,
        url: response.config.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        size: JSON.stringify(response.data).length,
      };
    } catch (error) {
      logger.error("URL fetch failed", { url, error: error.message });

      if (error.code === "ECONNABORTED") {
        throw new Error(`Request timeout after ${timeout}ms`);
      } else if (error.response) {
        throw new Error(
          `HTTP ${error.response.status}: ${error.response.statusText}`
        );
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
  }

  async checkUrlStatus(url) {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status
      });

      return {
        success: true,
        url,
        status: response.status,
        statusText: response.statusText,
        isOnline: response.status < 400,
        responseTime: response.headers["x-response-time"] || "unknown",
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
        isOnline: false,
      };
    }
  }

  async extractTextFromUrl(url) {
    try {
      const response = await this.fetchUrl(url);

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Simple text extraction (in a real implementation, you'd use a proper HTML parser)
      const text =
        typeof response.data === "string"
          ? response.data
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
          : JSON.stringify(response.data);

      return {
        success: true,
        url,
        text,
        length: text.length,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Text extraction failed", { url, error: error.message });
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }
}
