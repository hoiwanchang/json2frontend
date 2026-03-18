/**
 * A minimal JSON Schema representation used throughout this project.
 */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  nullable?: boolean;
  example?: unknown;
  enum?: unknown[];
  description?: string;
}

/**
 * Infers a JSON Schema from a runtime value.
 * Handles objects, arrays, primitives, and null.
 */
export function inferJsonSchema(value: unknown): JsonSchema {
  if (value === null || value === undefined) {
    return { type: "null", nullable: true };
  }

  if (Array.isArray(value)) {
    const itemSchema =
      value.length > 0 ? inferJsonSchema(value[0]) : { type: "unknown" };
    return { type: "array", items: itemSchema };
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const properties: Record<string, JsonSchema> = {};

    for (const [key, val] of Object.entries(obj)) {
      properties[key] = inferJsonSchema(val);
    }

    return { type: "object", properties };
  }

  if (typeof value === "boolean") {
    return { type: "boolean", example: value };
  }

  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "number", example: value };
  }

  if (typeof value === "string") {
    return { type: "string", example: value };
  }

  return { type: "unknown" };
}
