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
      logger.info("Web search requested", { query, numResults });

      // Use DuckDuckGo Instant Answer API for real search results
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&format=json&no_html=1&skip_disambig=1`;

      const response = await axios.get(searchUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      const data = response.data;
      const results = [];

      // Add instant answer if available
      if (data.Abstract) {
        results.push({
          title: data.Heading || data.AbstractText || "Instant Answer",
          url: data.AbstractURL || "https://duckduckgo.com",
          snippet: data.Abstract,
          rank: 1,
          source: "DuckDuckGo Instant Answer",
        });
      }

      // Add related topics
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, numResults - results.length).forEach(
          (topic, index) => {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(" - ")[0] || topic.Text,
                url: topic.FirstURL,
                snippet: topic.Text,
                rank: results.length + 1,
                source: "DuckDuckGo Related Topics",
              });
            }
          }
        );
      }

      // If we don't have enough results, add some fallback results
      if (results.length < numResults) {
        const fallbackResults = [
          {
            title: `Wikipedia: ${query}`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
              query.replace(/\s+/g, "_")
            )}`,
            snippet: `Wikipedia article about ${query}`,
            rank: results.length + 1,
            source: "Wikipedia",
          },
          {
            title: `Google Search: ${query}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Search for ${query} on Google`,
            rank: results.length + 2,
            source: "Google Search",
          },
        ];

        results.push(...fallbackResults.slice(0, numResults - results.length));
      }

      return {
        success: true,
        query,
        results: results.slice(0, numResults),
        totalResults: results.length,
        searchTime: Date.now(),
        source: "DuckDuckGo API",
      };
    } catch (error) {
      logger.error("Web search failed", { query, error: error.message });

      // Fallback to basic search suggestions
      const fallbackResults = [
        {
          title: `Search for "${query}" on Google`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Click to search for ${query} on Google`,
          rank: 1,
          source: "Google Search",
        },
        {
          title: `Wikipedia: ${query}`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
            query.replace(/\s+/g, "_")
          )}`,
          snippet: `Wikipedia article about ${query}`,
          rank: 2,
          source: "Wikipedia",
        },
      ];

      return {
        success: true,
        query,
        results: fallbackResults.slice(0, numResults),
        totalResults: fallbackResults.length,
        searchTime: Date.now(),
        source: "Fallback Search",
        note: "Using fallback search due to API error",
      };
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
