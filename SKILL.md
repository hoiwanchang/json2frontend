---
name: json2frontend
description: Fetch backend API data and generate frontend page specifications. Given any REST/JSON endpoint, this skill infers the JSON schema, analyzes the UI component needs, and produces a detailed frontend page spec ready for AI-assisted code generation.
version: 0.1.0
metadata:
  openclaw:
    emoji: "🖼️"
    homepage: https://github.com/hoiwanchang/json2frontend
    requires:
      bins:
        - node
    install:
      - kind: node
        package: json2frontend
        bins: [json2frontend]
---

# json2frontend

An MCP (Model Context Protocol) server that fetches backend API data and helps AI agents automatically generate corresponding frontend pages.

## Setup

After installing, register the MCP server in your OpenClaw configuration:

```json
{
  "mcpServers": {
    "json2frontend": {
      "command": "json2frontend"
    }
  }
}
```

If you prefer running via `npx` without a global install:

```json
{
  "mcpServers": {
    "json2frontend": {
      "command": "npx",
      "args": ["-y", "json2frontend"]
    }
  }
}
```

## Available tools

### `fetch_api_data`

Fetches a backend API endpoint and returns the raw response data together with an inferred JSON schema.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | string (URL) | ✅ | Full URL of the backend API endpoint |
| `method` | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` | No | HTTP method (default: `GET`) |
| `headers` | object | No | Custom headers (e.g. `Authorization`) |
| `body` | object | No | Request body for POST/PUT/PATCH requests |
| `timeout` | number | No | Timeout in ms (default: 10000, max: 30000) |

**Example**

```
fetch_api_data({ url: "https://jsonplaceholder.typicode.com/todos" })
```

### `analyze_api_structure`

Analyzes the structure of raw API response data and recommends appropriate UI components (DataTable, CardGrid, DetailCard, Pagination, etc.).

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | any | ✅ | Raw JSON data returned by the API |

**Returns** `shape`, `fields`, `itemFields`, `suggestedComponents`, `suggestedPageType`, `paginationFields`.

### `generate_frontend_spec`

Generates a comprehensive frontend page specification based on API data. The spec includes component definitions, TypeScript state management plan, UI layout sections, and tech stack recommendations.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | string (URL) | ✅ | Backend API URL the frontend page will consume |
| `method` | string | No | HTTP method (default: `GET`) |
| `data` | any | ✅ | Raw JSON data returned by the API |

**Returns** a complete `FrontendSpec` with: `components`, `stateManagement`, `uiLayout`, `suggestedTechStack`.

## Typical workflow

```
1. User asks: "Fetch https://api.example.com/products and build me a frontend page."

2. Call fetch_api_data({ url: "https://api.example.com/products" })
   → returns raw data + inferred schema

3. Call generate_frontend_spec({ url: "...", data: <result from step 2> })
   → returns full FrontendSpec

4. Use the spec to generate a React component with DataTable, SearchInput, Pagination, etc.
```

## Security notes

- Responses are capped at **5 MB** to prevent memory exhaustion.
- Maximum **5 redirects** followed per request.
- Timeout is enforced (500 ms - 30 s, configurable).
- No credentials are stored or logged.
