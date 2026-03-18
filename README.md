# json2frontend

An **MCP (Model Context Protocol) server** that fetches backend API data and helps AI agents — such as GitHub Copilot, Claude Code, and others — automatically generate corresponding frontend pages.

## What it does

Given a backend API URL, `json2frontend`:

1. **Fetches** the API response (handles REST/JSON endpoints)
2. **Analyzes** the response structure — detecting whether it's a list, paginated list, single object, or primitive
3. **Generates** a comprehensive frontend page specification including:
   - Suggested UI components (DataTable, CardGrid, DetailCard, Pagination, etc.)
   - TypeScript state management plan
   - UI layout sections (Header / Controls / Content / Footer)
   - Recommended tech stack (React, Ant Design / shadcn/ui, TanStack Query, etc.)

AI agents use this spec to write real, working frontend code without guessing at data shapes or UI patterns.

## Tech stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | **TypeScript** | Type-safe, excellent IDE support, MCP SDK is TS-first |
| MCP framework | **@modelcontextprotocol/sdk** | Official SDK; supported by Claude, GitHub Copilot, and other MCP-compatible agents |
| HTTP client | **axios** | Mature, configurable; handles timeouts, redirects, and response size limits out of the box |
| Schema | **zod** | Declarative tool input validation; pairs naturally with the MCP SDK |
| Tests | **Jest + ts-jest** | Standard Node.js testing with TypeScript support |

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP server (stdio transport)

Add this server to your MCP client configuration (e.g. Claude Desktop, GitHub Copilot MCP, etc.):

```json
{
  "mcpServers": {
    "json2frontend": {
      "command": "node",
      "args": ["/path/to/json2frontend/dist/index.js"]
    }
  }
}
```

### Available tools

#### `fetch_api_data`

Fetch data from a backend API endpoint and return raw data + inferred JSON schema.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | ✅ | Backend API endpoint |
| `method` | GET \| POST \| PUT \| PATCH \| DELETE | No | HTTP method (default: `GET`) |
| `headers` | object | No | Custom headers (e.g. `Authorization`) |
| `body` | object | No | Request body for POST/PUT/PATCH |
| `timeout` | number | No | Timeout in ms (default: 10000, max: 30000) |

#### `analyze_api_structure`

Analyze a raw API response and receive component/UI recommendations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | any | ✅ | Raw JSON data from the API |

Returns: `shape`, `fields`, `itemFields`, `suggestedComponents`, `suggestedPageType`, `paginationFields`.

#### `generate_frontend_spec`

Generate a full frontend page specification ready for AI-assisted code generation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | ✅ | Backend API URL the frontend page will consume |
| `method` | string | No | HTTP method (default: `GET`) |
| `data` | any | ✅ | Raw JSON data from the API |

Returns a complete `FrontendSpec` with: `components`, `stateManagement`, `uiLayout`, `suggestedTechStack`.

### Example workflow (with an AI agent)

```
User: Fetch https://jsonplaceholder.typicode.com/todos and build me a frontend page.

Agent calls: fetch_api_data({ url: "https://jsonplaceholder.typicode.com/todos" })
Agent calls: generate_frontend_spec({ url: "...", data: <result from above> })
Agent uses spec to generate React component code with DataTable, SearchInput, etc.
```

## Development

```bash
npm run dev       # Run server directly with tsx (no build step)
npm run build     # Compile TypeScript to dist/
npm test          # Run all tests
npm run lint      # Lint source files
```

## Security

- Responses are capped at **5 MB** to prevent memory exhaustion
- Max **5 redirects** followed per request
- Timeout enforced (500 ms – 30 s, configurable)
- No credentials are stored or logged

