# Tool Output Formatter

A comprehensive tool output formatter that converts raw tool execution results into beautiful, user-friendly displays similar to GPT and Gemini interfaces.

## Features

- **Multiple Tool Types**: Supports web search, file operations, system info, calculations, and more
- **Beautiful Formatting**: Converts raw JSON into readable markdown with icons and styling
- **Vue.js Integration**: Ready-to-use Vue components for frontend display
- **Extensible**: Easy to add custom formatters for new tool types
- **Metadata Support**: Includes execution metadata and timing information

## Quick Start

### Backend Usage (Node.js)

```javascript
import { toolFormatter } from "./src/utils/toolFormatter.js";

// Format a web search result
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
    ],
    count: 2,
    source: "DuckDuckGo API",
  },
  executionId: "286947181",
  duration: 1032,
  timestamp: "2025-09-30T08:25:48.384Z",
};

const formatted = toolFormatter.formatToolResult(
  "web_search",
  webSearchResult,
  {
    includeMetadata: true,
    includeRawResult: false,
    maxResults: 5,
  }
);

console.log(formatted.displayContent);
```

### Frontend Usage (Vue.js)

```vue
<template>
  <div>
    <!-- Display formatted tool results -->
    <ToolResult
      v-for="result in toolResults"
      :key="result.toolName"
      :tool-result="result"
      :show-metadata="true"
      :show-raw-result="false"
      @copy="handleCopy"
    />
  </div>
</template>

<script setup>
import ToolResult from "@/components/chat/ToolResult.vue";
import { enhancedChatService } from "@/services/enhancedChatService.js";

// Use enhanced chat service with formatting
const response = await enhancedChatService.sendMessage(messages, {
  formatToolResults: true,
  showMetadata: true,
});
</script>
```

## Supported Tool Types

### Web Search

- Formats search queries and results
- Shows source information and metadata
- Displays clickable links and snippets

### File Operations

- File reading/writing results
- Directory listings with file details
- File size and modification dates

### System Information

- Platform and version details
- Memory usage statistics
- Uptime information

### Command Execution

- Command output formatting
- Exit codes and error handling
- Syntax highlighting for code

### Data Processing

- JSON validation and formatting
- Mathematical calculations
- Data transformation results

## API Reference

### ToolFormatter Class

#### `formatToolResult(toolName, result, options)`

Formats a tool execution result for display.

**Parameters:**

- `toolName` (string): Name of the tool that was executed
- `result` (object): Raw tool execution result
- `options` (object): Formatting options
  - `includeMetadata` (boolean): Include execution metadata
  - `includeRawResult` (boolean): Include raw result data
  - `maxResults` (number): Maximum number of results to display
  - `showSuccessStatus` (boolean): Show success/failure status

**Returns:**

- `toolName` (string): Name of the tool
- `success` (boolean): Whether the tool executed successfully
- `displayContent` (string): Formatted markdown content for display
- `summary` (string): Brief summary of the result
- `metadata` (object): Execution metadata
- `rawResult` (object): Raw result data (if requested)
- `formattedAt` (string): Timestamp of formatting

#### `registerFormatter(toolName, formatter)`

Register a custom formatter for a specific tool type.

```javascript
toolFormatter.registerFormatter("custom_tool", (result, options) => {
  return {
    displayContent: `🎯 **Custom Result**\n\n${JSON.stringify(
      result,
      null,
      2
    )}`,
    summary: "Custom tool executed successfully",
  };
});
```

### Vue Components

#### ToolResult Component

Displays a formatted tool result with interactive features.

**Props:**

- `toolResult` (object): Formatted tool result object
- `showMetadata` (boolean): Show metadata section
- `showRawResult` (boolean): Show raw result section

**Events:**

- `copy`: Emitted when copy button is clicked
- `expand`: Emitted when result is expanded
- `collapse`: Emitted when result is collapsed

### Enhanced Chat Service

#### `sendMessage(messages, options)`

Send messages with automatic tool result formatting.

**Options:**

- `formatToolResults` (boolean): Enable tool result formatting
- `showMetadata` (boolean): Show execution metadata
- `showRawResults` (boolean): Show raw result data

## Examples

### Web Search Formatting

**Input:**

```json
{
  "success": true,
  "result": {
    "query": "Springboks match schedule this weekend",
    "results": [
      {
        "title": "Wikipedia: Springboks match schedule",
        "url": "https://en.wikipedia.org/wiki/Springboks_match_schedule",
        "snippet": "Wikipedia article about Springboks match schedule"
      }
    ],
    "count": 1,
    "source": "DuckDuckGo API"
  }
}
```

**Output:**

```markdown
🔍 **Web Search Results**

**Query:** "Springboks match schedule this weekend"
**Found:** 1 results
**Source:** DuckDuckGo API

**Results:**

1. **Wikipedia: Springboks match schedule**
   🔗 [https://en.wikipedia.org/wiki/Springboks_match_schedule](https://en.wikipedia.org/wiki/Springboks_match_schedule)
   📝 Wikipedia article about Springboks match schedule
   📊 Source: Wikipedia
```

### File Operation Formatting

**Input:**

```json
{
  "success": true,
  "path": "/path/to/file.txt",
  "size": 1024,
  "content": "File content here..."
}
```

**Output:**

```markdown
📁 **File Operation Successful**

**Path:** `/path/to/file.txt`
**Size:** 1 KB

**Content Preview:**
```

File content here...

```

```

## Integration

### Backend Integration

1. Import the formatter in your Express app:

```javascript
import { toolFormatter } from "./src/utils/toolFormatter.js";
```

2. Add the formatting endpoint:

```javascript
app.post("/format-tool-result", async (req, res) => {
  const { toolName, result, options } = req.body;
  const formatted = toolFormatter.formatToolResult(toolName, result, options);
  res.json({ success: true, formatted });
});
```

### Frontend Integration

1. Import the enhanced chat service:

```javascript
import { enhancedChatService } from "@/services/enhancedChatService.js";
```

2. Use in your Vue components:

```vue
<script setup>
import ToolResult from "@/components/chat/ToolResult.vue";

const response = await enhancedChatService.sendMessage(messages, {
  formatToolResults: true,
});
</script>
```

## Testing

Run the test script to see the formatter in action:

```bash
cd ATLAS/LMStudio
node test-formatter.js
```

This will demonstrate formatting with your exact example output.

## Customization

### Adding New Tool Types

1. Create a formatter function:

```javascript
const formatCustomTool = (result, options) => {
  return {
    displayContent: `🎯 **Custom Tool Result**\n\n${result.data}`,
    summary: "Custom tool executed successfully",
  };
};
```

2. Register the formatter:

```javascript
toolFormatter.registerFormatter("custom_tool", formatCustomTool);
```

### Styling Customization

The Vue components use CSS custom properties for easy theming:

```css
.tool-result {
  --success-color: #10b981;
  --error-color: #ef4444;
  --background: rgba(255, 255, 255, 0.05);
  --border: rgba(255, 255, 255, 0.1);
}
```

## License

MIT License - see LICENSE file for details.
