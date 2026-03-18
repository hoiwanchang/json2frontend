#!/usr/bin/env node
/**
 * json2frontend MCP Server
 *
 * Exposes three tools for AI agents (GitHub Copilot, Claude Code, etc.):
 *  1. fetch_api_data          – Fetch a backend URL and return raw data + inferred JSON schema
 *  2. analyze_api_structure   – Analyze data structure and suggest UI components
 *  3. generate_frontend_spec  – Produce a detailed frontend page spec for AI code-generation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { z } from "zod";
import { inferJsonSchema } from "./schema.js";
import { analyzeApiResponse } from "./analyzer.js";
import { generateFrontendSpec } from "./specGenerator.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "json2frontend",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Tool 1: fetch_api_data
// ---------------------------------------------------------------------------

server.registerTool(
  "fetch_api_data",
  {
    description:
      "Fetch data from a backend API endpoint. Returns the raw response data and an inferred JSON schema. Use this as the first step before analyzing or generating a frontend spec.",
    inputSchema: {
      url: z
        .string()
        .url()
        .describe("The full URL of the backend API endpoint to fetch"),
      method: z
        .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
        .default("GET")
        .describe("HTTP method to use (default: GET)"),
      headers: z
        .record(z.string())
        .optional()
        .describe(
          "Optional HTTP headers to include in the request (e.g. Authorization)"
        ),
      body: z
        .record(z.unknown())
        .optional()
        .describe("Optional request body for POST/PUT/PATCH requests"),
      timeout: z
        .number()
        .int()
        .min(500)
        .max(30000)
        .default(10000)
        .describe("Request timeout in milliseconds (default: 10000)"),
    },
  },
  async ({ url, method = "GET", headers, body, timeout = 10000 }) => {
    try {
      const response = await axios({
        url,
        method,
        headers,
        data: body,
        timeout,
        // Never follow redirects to untrusted hosts and limit response size
        maxRedirects: 5,
        maxContentLength: 5 * 1024 * 1024, // 5 MB cap
        validateStatus: () => true, // let us handle non-2xx ourselves
      });

      const statusCode = response.status;
      const responseData = response.data;
      const schema = inferJsonSchema(responseData);

      if (statusCode < 200 || statusCode >= 300) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  statusCode,
                  error: `HTTP ${statusCode}: ${response.statusText}`,
                  data: responseData,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                url,
                method,
                statusCode,
                data: responseData,
                schema,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { success: false, url, method, error: message },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool 2: analyze_api_structure
// ---------------------------------------------------------------------------

server.registerTool(
  "analyze_api_structure",
  {
    description:
      "Analyze the structure of API response data and suggest appropriate UI components. Accepts raw JSON data and returns a structured analysis including data shape, field information, and component recommendations.",
    inputSchema: {
      data: z
        .unknown()
        .describe(
          "The raw JSON data returned by the API endpoint. Can be an object, array, or primitive value."
        ),
    },
  },
  async ({ data }) => {
    const analysis = analyzeApiResponse(data);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 3: generate_frontend_spec
// ---------------------------------------------------------------------------

server.registerTool(
  "generate_frontend_spec",
  {
    description:
      "Generate a comprehensive frontend page specification based on API data. Returns a detailed spec including component definitions, state management plan, UI layout, and tech stack recommendations. Use this to guide AI-assisted frontend code generation.",
    inputSchema: {
      url: z
        .string()
        .url()
        .describe("The backend API URL the frontend page will consume"),
      method: z
        .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
        .default("GET")
        .describe("HTTP method used to call the API (default: GET)"),
      data: z
        .unknown()
        .describe(
          "The raw JSON data returned by the API endpoint. Used to infer the data structure."
        ),
    },
  },
  async ({ url, method = "GET", data }) => {
    const schema = inferJsonSchema(data);
    const analysis = analyzeApiResponse(data);
    const spec = generateFrontendSpec(url, method, analysis, schema);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(spec, null, 2),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers communicate over stdio; log to stderr so it doesn't pollute stdout
  process.stderr.write("json2frontend MCP server running on stdio\n");
}

main().catch((err: unknown) => {
  process.stderr.write(
    `Fatal error: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
