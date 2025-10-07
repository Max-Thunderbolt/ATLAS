# LLM Tools API

A comprehensive Node.js API server that provides tool execution endpoints for Large Language Models (LLMs) like Gemma 3 12b from LM Studio. This API allows LLMs to interact with various tools and services through a standardized interface.

## Features

- 🛠️ **Tool Registry System**: Dynamic tool registration and management
- 🔐 **Authentication**: API key and JWT token support
- 🚀 **High Performance**: Concurrent tool execution with rate limiting
- 📊 **Comprehensive Logging**: Detailed execution tracking and monitoring
- 🔄 **Batch Operations**: Execute multiple tools simultaneously
- 🛡️ **Security**: Input validation, error handling, and CORS protection
- 📁 **File Operations**: Read, write, process, and manage files
- 🌐 **Web Tools**: Search, fetch URLs, and extract content
- 📊 **Data Processing**: JSON manipulation, calculations, and transformations

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone or download the project
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment configuration:

   ```bash
   cp env.example .env
   ```

4. Configure your environment variables in `.env`

5. Start the server:

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Health Check

```
GET /health
```

Returns server status and version information.

### Tool Discovery

```
GET /tools
```

Returns a list of all available tools with their descriptions and parameters.

### Tool Execution

```
POST /execute
Content-Type: application/json
X-API-Key: your-api-key

{
  "tool": "read_file",
  "parameters": {
    "path": "/path/to/file.txt"
  },
  "requestId": "optional-request-id"
}
```

### Batch Tool Execution

```
POST /execute/batch
Content-Type: application/json
X-API-Key: your-api-key

{
  "tools": [
    {
      "name": "read_file",
      "parameters": { "path": "/file1.txt" }
    },
    {
      "name": "web_search",
      "parameters": { "query": "AI tools" }
    }
  ],
  "requestId": "batch-request-123"
}
```

### Tool Status

```
GET /tools/:toolName/status
```

Returns the status and usage statistics for a specific tool.

## Available Tools

### File Operations

- `read_file` - Read file contents
- `write_file` - Write content to file
- `list_directory` - List directory contents
- `create_directory` - Create new directory
- `delete_file` - Delete file or directory
- `copy_file` - Copy file to new location
- `move_file` - Move/rename file
- `process_image` - Resize/convert images
- `extract_text_from_pdf` - Extract text from PDF
- `extract_text_from_docx` - Extract text from Word documents
- `create_archive` - Create ZIP/TAR archives

### Web Operations

- `web_search` - Search the web
- `fetch_url` - Fetch content from URL
- `check_url_status` - Check if URL is accessible
- `extract_text_from_url` - Extract text content from web page

### Data Processing

- `process_json` - Parse, stringify, or validate JSON
- `calculate` - Perform mathematical calculations
- `convert_data` - Convert between data formats

### System Operations

- `get_system_info` - Get system information
- `execute_command` - Execute system commands (use with caution)

## Authentication

The API supports two authentication methods:

### API Key Authentication

```bash
curl -X POST http://localhost:3000/execute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"tool": "read_file", "parameters": {"path": "/tmp/test.txt"}}'
```

### JWT Token Authentication

```bash
curl -X POST http://localhost:3000/execute \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"tool": "read_file", "parameters": {"path": "/tmp/test.txt"}}'
```

## Configuration

### Environment Variables

| Variable                  | Description                | Default                       |
| ------------------------- | -------------------------- | ----------------------------- |
| `PORT`                    | Server port                | 3000                          |
| `NODE_ENV`                | Environment                | development                   |
| `JWT_SECRET`              | JWT signing secret         | Required                      |
| `API_KEY`                 | API key for authentication | Required                      |
| `ALLOWED_ORIGINS`         | CORS allowed origins       | localhost:3000,localhost:5173 |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window          | 900000 (15 min)               |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window    | 100                           |
| `MAX_FILE_SIZE`           | Maximum file size          | 10485760 (10MB)               |
| `TOOL_TIMEOUT`            | Tool execution timeout     | 30000 (30s)                   |
| `MAX_CONCURRENT_TOOLS`    | Max concurrent executions  | 5                             |

## Usage Examples

### Basic File Operations

```javascript
// Read a file
const response = await fetch("http://localhost:3000/execute", {
  method: "POST",
  headers: {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tool: "read_file",
    parameters: { path: "/path/to/file.txt" },
  }),
});

const result = await response.json();
console.log(result.result.content);
```

### Web Search

```javascript
// Search the web
const response = await fetch("http://localhost:3000/execute", {
  method: "POST",
  headers: {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tool: "web_search",
    parameters: {
      query: "artificial intelligence",
      num_results: 5,
    },
  }),
});
```

### Batch Operations

```javascript
// Execute multiple tools
const response = await fetch("http://localhost:3000/execute/batch", {
  method: "POST",
  headers: {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tools: [
      {
        name: "read_file",
        parameters: { path: "/file1.txt" },
      },
      {
        name: "web_search",
        parameters: { query: "AI news" },
      },
    ],
  }),
});
```

## Integration with LM Studio

To use this API with LM Studio and Gemma 3 12b:

1. Start the API server
2. Configure LM Studio to use the API endpoints
3. Use the tool calling format in your prompts:

```
You have access to the following tools:
- read_file: Read file contents
- write_file: Write content to file
- web_search: Search the web
- calculate: Perform calculations

Use the tools when needed to help the user.
```

## Error Handling

The API provides comprehensive error handling:

- **400 Bad Request**: Invalid parameters or malformed requests
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Tool or endpoint not found
- **408 Timeout**: Tool execution timeout
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side errors

## Development

### Project Structure

```
ATLAS/LMStudio/
├── index.js                 # Main server file
├── package.json            # Dependencies and scripts
├── env.example            # Environment configuration template
├── src/
│   ├── core/
│   │   └── executor.js    # Tool execution engine
│   ├── middleware/
│   │   ├── auth.js        # Authentication middleware
│   │   └── error.js       # Error handling middleware
│   ├── tools/
│   │   ├── registry.js    # Tool registry and management
│   │   ├── fileTools.js  # File operation tools
│   │   └── webTools.js   # Web operation tools
│   └── utils/
│       └── logger.js      # Logging utilities
└── logs/                  # Log files (created automatically)
```

### Adding Custom Tools

1. Create a new tool handler in `src/tools/`
2. Register the tool in `src/tools/registry.js`
3. Implement the handler function
4. Add parameter validation

Example:

```javascript
// In registry.js
this.registerTool({
  name: 'my_custom_tool',
  description: 'My custom tool description',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input parameter' }
    },
    required: ['input']
  },
  category: 'custom',
  handler: this.myCustomToolHandler.bind(this)
});

async myCustomToolHandler(parameters) {
  const { input } = parameters;
  // Your tool logic here
  return { success: true, result: 'processed' };
}
```

## Security Considerations

- Always use HTTPS in production
- Keep API keys and JWT secrets secure
- Implement proper input validation
- Use rate limiting to prevent abuse
- Monitor tool execution for suspicious activity
- Regularly update dependencies

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:

- Check the logs in the `logs/` directory
- Review the API documentation
- Check tool status with `/tools/:toolName/status`
- Monitor server health with `/health`
