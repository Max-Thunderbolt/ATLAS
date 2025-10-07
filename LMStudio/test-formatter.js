#!/usr/bin/env node

/**
 * Quick test script to demonstrate the tool formatter
 * Run with: node test-formatter.js
 */

import { toolFormatter } from "./src/utils/toolFormatter.js";

// Your exact example from the user query
const exampleOutput = {
  success: true,
  result: {
    success: true,
    query: "Springboks match schedule this weekend",
    results: [
      {
        title: "Wikipedia: Springboks match schedule this weekend",
        url: "https://en.wikipedia.org/wiki/Springboks_match_schedule_this_weekend",
        snippet:
          "Wikipedia article about Springboks match schedule this weekend",
        rank: 1,
        source: "Wikipedia",
      },
      {
        title: "Google Search: Springboks match schedule this weekend",
        url: "https://www.google.com/search?q=Springboks%20match%20schedule%20this%20weekend",
        snippet: "Search for Springboks match schedule this weekend on Google",
        rank: 2,
        source: "Google Search",
      },
    ],
    count: 2,
    source: "DuckDuckGo API",
    searchTime: 1759220748383,
  },
  executionId: "286947181",
  duration: 1032,
  timestamp: "2025-09-30T08:25:48.384Z",
};

console.log("🔧 TOOL FORMATTER TEST");
console.log("======================\n");

console.log("📥 INPUT (Raw Tool Output):");
console.log(
  "Tool web_search executed successfully. Result:",
  JSON.stringify(exampleOutput, null, 2)
);

console.log("\n📤 OUTPUT (Formatted Display):");
console.log("==============================");

// Format the tool result
const formatted = toolFormatter.formatToolResult("web_search", exampleOutput, {
  includeMetadata: true,
  includeRawResult: false,
  maxResults: 5,
});

console.log(formatted.displayContent);

console.log("\n📊 METADATA:");
console.log(JSON.stringify(formatted.metadata, null, 2));

console.log("\n✅ SUMMARY:");
console.log(formatted.summary);

console.log(
  "\n🎉 The formatter successfully converted the raw tool output into a beautiful, user-friendly display!"
);
