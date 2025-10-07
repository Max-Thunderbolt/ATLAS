import { toolFormatter } from "../src/utils/toolFormatter.js";

/**
 * Tool Formatter Example Usage
 * Demonstrates how to format different types of tool execution results
 */

console.log("=== TOOL FORMATTER EXAMPLE ===\n");

// Example 1: Web Search Results (like your provided example)
const webSearchResult = {
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

console.log("1. WEB SEARCH RESULT FORMATTING:");
console.log("=====================================");
const webFormatted = toolFormatter.formatToolResult(
  "web_search",
  webSearchResult,
  {
    includeMetadata: true,
    includeRawResult: false,
    maxResults: 5,
  }
);

console.log("Tool Name:", webFormatted.toolName);
console.log("Success:", webFormatted.success);
console.log("Summary:", webFormatted.summary);
console.log("\nDisplay Content:");
console.log(webFormatted.displayContent);
console.log("\nMetadata:", JSON.stringify(webFormatted.metadata, null, 2));

// Example 2: File Operation Result
const fileOperationResult = {
  success: true,
  content:
    "This is a sample file content that demonstrates the formatting capabilities of the tool formatter. It shows how different types of tool results can be displayed in a user-friendly format similar to GPT and Gemini interfaces.",
  size: 1024,
  path: "/path/to/sample/file.txt",
  message: "File read successfully",
};

console.log("\n\n2. FILE OPERATION RESULT FORMATTING:");
console.log("=====================================");
const fileFormatted = toolFormatter.formatToolResult(
  "read_file",
  fileOperationResult
);
console.log("Display Content:");
console.log(fileFormatted.displayContent);

// Example 3: System Information Result
const systemInfoResult = {
  success: true,
  info_type: "all",
  data: {
    timestamp: "2025-09-30T08:25:48.384Z",
    platform: "win32",
    nodeVersion: "v18.17.0",
    uptime: 3600,
    memory: {
      rss: 50331648,
      heapTotal: 20971520,
      heapUsed: 15728640,
      external: 1048576,
    },
  },
};

console.log("\n\n3. SYSTEM INFO RESULT FORMATTING:");
console.log("==================================");
const systemFormatted = toolFormatter.formatToolResult(
  "get_system_info",
  systemInfoResult
);
console.log("Display Content:");
console.log(systemFormatted.displayContent);

// Example 4: Directory Listing Result
const directoryResult = {
  success: true,
  path: "/home/user/documents",
  items: [
    {
      name: "project1",
      path: "/home/user/documents/project1",
      isDirectory: true,
      size: 4096,
      modified: "2025-09-29T10:30:00.000Z",
    },
    {
      name: "report.pdf",
      path: "/home/user/documents/report.pdf",
      isDirectory: false,
      size: 2048576,
      modified: "2025-09-28T15:45:00.000Z",
    },
    {
      name: "notes.txt",
      path: "/home/user/documents/notes.txt",
      isDirectory: false,
      size: 1024,
      modified: "2025-09-30T08:00:00.000Z",
    },
  ],
  count: 3,
};

console.log("\n\n4. DIRECTORY LISTING RESULT FORMATTING:");
console.log("=======================================");
const dirFormatted = toolFormatter.formatToolResult(
  "list_directory",
  directoryResult
);
console.log("Display Content:");
console.log(dirFormatted.displayContent);

// Example 5: Command Execution Result
const commandResult = {
  success: true,
  command: "ls -la",
  output:
    "total 8\ndrwxr-xr-x 2 user user 4096 Sep 30 08:00 .\ndrwxr-xr-x 3 user user 4096 Sep 29 10:30 ..\n-rw-r--r-- 1 user user 1024 Sep 30 08:00 notes.txt\n-rw-r--r-- 1 user user 2048576 Sep 28 15:45 report.pdf",
  exitCode: 0,
};

console.log("\n\n5. COMMAND EXECUTION RESULT FORMATTING:");
console.log("======================================");
const cmdFormatted = toolFormatter.formatToolResult(
  "execute_command",
  commandResult
);
console.log("Display Content:");
console.log(cmdFormatted.displayContent);

// Example 6: Calculation Result
const calculationResult = {
  success: true,
  expression: "2 * 3 + 4 * 5",
  result: 26,
};

console.log("\n\n6. CALCULATION RESULT FORMATTING:");
console.log("=================================");
const calcFormatted = toolFormatter.formatToolResult(
  "calculate",
  calculationResult
);
console.log("Display Content:");
console.log(calcFormatted.displayContent);

// Example 7: JSON Processing Result
const jsonResult = {
  success: true,
  result: {
    name: "John Doe",
    age: 30,
    city: "New York",
    hobbies: ["reading", "swimming", "coding"],
  },
  valid: true,
};

console.log("\n\n7. JSON PROCESSING RESULT FORMATTING:");
console.log("===================================");
const jsonFormatted = toolFormatter.formatToolResult(
  "process_json",
  jsonResult
);
console.log("Display Content:");
console.log(jsonFormatted.displayContent);

// Example 8: URL Fetch Result
const urlFetchResult = {
  success: true,
  url: "https://api.github.com/users/octocat",
  status: 200,
  statusText: "OK",
  data: {
    login: "octocat",
    id: 1,
    node_id: "MDQ6VXNlcjE=",
    avatar_url: "https://github.com/images/error/octocat_happy.gif",
    gravatar_id: "",
    url: "https://api.github.com/users/octocat",
    html_url: "https://github.com/octocat",
    followers_url: "https://api.github.com/users/octocat/followers",
    following_url:
      "https://api.github.com/users/octocat/following{/other_user}",
    gists_url: "https://api.github.com/users/octocat/gists{/gist_id}",
    starred_url: "https://api.github.com/users/octocat/starred{/owner}{/repo}",
    subscriptions_url: "https://api.github.com/users/octocat/subscriptions",
    organizations_url: "https://api.github.com/users/octocat/orgs",
    repos_url: "https://api.github.com/users/octocat/repos",
    events_url: "https://api.github.com/users/octocat/events{/privacy}",
    received_events_url: "https://api.github.com/users/octocat/received_events",
    type: "User",
    site_admin: false,
    name: "The Octocat",
    company: "GitHub",
    blog: "https://github.com/blog",
    location: "San Francisco",
    email: null,
    hireable: null,
    bio: null,
    twitter_username: null,
    public_repos: 8,
    public_gists: 8,
    followers: 8,
    following: 0,
    created_at: "2008-01-14T04:33:35Z",
    updated_at: "2011-01-26T18:44:02Z",
  },
  size: 1024,
};

console.log("\n\n8. URL FETCH RESULT FORMATTING:");
console.log("===============================");
const urlFormatted = toolFormatter.formatToolResult(
  "fetch_url",
  urlFetchResult
);
console.log("Display Content:");
console.log(urlFormatted.displayContent);

// Example 9: Error Result
const errorResult = {
  success: false,
  error: "Tool execution failed due to invalid parameters",
  tool: "web_search",
};

console.log("\n\n9. ERROR RESULT FORMATTING:");
console.log("===========================");
const errorFormatted = toolFormatter.formatToolResult(
  "web_search",
  errorResult
);
console.log("Display Content:");
console.log(errorFormatted.displayContent);

// Example 10: Custom Tool Formatter Registration
console.log("\n\n10. CUSTOM TOOL FORMATTER REGISTRATION:");
console.log("=========================================");

// Register a custom formatter for a specific tool
toolFormatter.registerFormatter("custom_tool", (result, options) => {
  return {
    displayContent: `🎯 **Custom Tool Result**\n\n**Status:** ${
      result.success ? "Success" : "Failed"
    }\n**Data:** ${JSON.stringify(result.data, null, 2)}`,
    summary: `Custom tool executed ${
      result.success ? "successfully" : "with errors"
    }`,
  };
});

const customResult = {
  success: true,
  data: {
    customField: "customValue",
    timestamp: new Date().toISOString(),
  },
};

const customFormatted = toolFormatter.formatToolResult(
  "custom_tool",
  customResult
);
console.log("Custom Tool Display Content:");
console.log(customFormatted.displayContent);

console.log("\n\n=== FORMATTER CAPABILITIES ===");
console.log("Available formatters:", toolFormatter.getFormatters());

console.log("\n=== EXAMPLE COMPLETE ===");
console.log(
  "The tool formatter successfully formats various types of tool execution results"
);
console.log(
  "into user-friendly displays similar to GPT and Gemini interfaces."
);
