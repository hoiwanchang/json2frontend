import { inferJsonSchema, type JsonSchema } from "./schema.js";

export type DataShape =
  | "list"
  | "paginated-list"
  | "object"
  | "primitive"
  | "empty";

export interface ComponentSuggestion {
  component: string;
  props: string[];
  description: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  example: unknown;
  suggestedInput?: string;
}

export interface ApiAnalysis {
  shape: DataShape;
  fields: FieldInfo[];
  itemFields?: FieldInfo[];
  totalItems?: number;
  suggestedComponents: ComponentSuggestion[];
  suggestedPageType: string;
  paginationFields?: string[];
}

/**
 * Recursively extracts field information from a JSON schema object.
 */
function extractFields(
  schema: JsonSchema,
  exampleData: unknown
): FieldInfo[] {
  if (schema.type !== "object" || !schema.properties) return [];

  const fields: FieldInfo[] = [];

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const example =
      exampleData != null &&
      typeof exampleData === "object" &&
      !Array.isArray(exampleData)
        ? (exampleData as Record<string, unknown>)[key]
        : undefined;

    fields.push({
      name: key,
      type: propSchema.type ?? "unknown",
      nullable: propSchema.nullable ?? false,
      example,
      suggestedInput: suggestInputType(key, propSchema.type ?? "unknown"),
    });
  }

  return fields;
}

/**
 * Suggests an HTML/UI input type based on field name and data type.
 */
function suggestInputType(fieldName: string, dataType: string): string {
  const lower = fieldName.toLowerCase();

  if (lower.includes("email")) return "email";
  if (lower.includes("password")) return "password";
  if (lower.includes("phone") || lower.includes("tel")) return "tel";
  if (lower.includes("url") || lower.includes("link")) return "url";
  if (
    lower.includes("date") ||
    lower.includes("_at") ||
    lower.includes("time")
  )
    return "datetime";
  if (lower.includes("image") || lower.includes("avatar")) return "image";
  if (lower.includes("description") || lower.includes("content"))
    return "textarea";
  if (lower.includes("status") || lower.includes("type")) return "select";
  if (lower.includes("enabled") || lower.includes("active")) return "checkbox";
  if (dataType === "boolean") return "checkbox";
  if (dataType === "number" || dataType === "integer") return "number";
  return "text";
}

/**
 * Detects pagination-related field names.
 */
function detectPaginationFields(fields: FieldInfo[]): string[] {
  const paginationKeywords = [
    "total",
    "count",
    "page",
    "pages",
    "limit",
    "offset",
    "per_page",
    "pageSize",
    "hasNext",
    "hasPrev",
    "next",
    "previous",
    "cursor",
  ];
  return fields
    .map((f) => f.name)
    .filter((name) =>
      paginationKeywords.some((kw) =>
        name.toLowerCase().includes(kw.toLowerCase())
      )
    );
}

/**
 * Determines the shape of the API response and which list/item fields to expose.
 */
function detectShape(
  data: unknown,
  schema: JsonSchema
): {
  shape: DataShape;
  listData?: unknown[];
  objectData?: unknown;
  listItemSchema?: JsonSchema;
  paginationFields?: string[];
} {
  if (data === null || data === undefined) {
    return { shape: "empty" };
  }

  if (Array.isArray(data)) {
    return {
      shape: "list",
      listData: data,
      listItemSchema: schema.items,
    };
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const objSchema = schema as JsonSchema & {
      properties?: Record<string, JsonSchema>;
    };

    // Look for a list-like field inside the object (paginated responses)
    if (objSchema.properties) {
      for (const [key, propSchema] of Object.entries(objSchema.properties)) {
        if (propSchema.type === "array") {
          const topFields = extractFields(schema, data);
          const paginationFields = detectPaginationFields(topFields);
          return {
            shape: "paginated-list",
            listData: obj[key] as unknown[],
            listItemSchema: propSchema.items,
            objectData: data,
            paginationFields,
          };
        }
      }
    }

    if (
      typeof data !== "string" &&
      typeof data !== "number" &&
      typeof data !== "boolean"
    ) {
      return { shape: "object", objectData: data };
    }
  }

  return { shape: "primitive" };
}

/**
 * Suggests UI components based on shape and field types.
 */
function suggestComponents(
  shape: DataShape,
  fields: FieldInfo[],
  itemFields?: FieldInfo[]
): ComponentSuggestion[] {
  const suggestions: ComponentSuggestion[] = [];

  if (shape === "list" || shape === "paginated-list") {
    const displayFields = itemFields ?? fields;
    const hasImage = displayFields.some((f) => f.suggestedInput === "image");
    const hasStatus = displayFields.some((f) => f.suggestedInput === "select");
    const hasDate = displayFields.some((f) => f.suggestedInput === "datetime");

    if (hasImage) {
      suggestions.push({
        component: "CardGrid",
        props: displayFields.map((f) => f.name),
        description: "Grid of cards, each showing an item with image preview",
      });
    }

    suggestions.push({
      component: "DataTable",
      props: displayFields.map((f) => f.name),
      description: `Sortable, filterable table with columns: ${displayFields.map((f) => f.name).join(", ")}`,
    });

    if (hasStatus) {
      suggestions.push({
        component: "FilterBar",
        props: displayFields
          .filter((f) => f.suggestedInput === "select")
          .map((f) => f.name),
        description: "Dropdown filters for status/type fields",
      });
    }

    if (hasDate) {
      suggestions.push({
        component: "DateRangePicker",
        props: displayFields
          .filter((f) => f.suggestedInput === "datetime")
          .map((f) => f.name),
        description: "Date range filter for temporal fields",
      });
    }

    if (shape === "paginated-list") {
      suggestions.push({
        component: "Pagination",
        props: ["page", "totalPages", "onPageChange"],
        description: "Pagination controls for navigating list pages",
      });
    }

    suggestions.push({
      component: "SearchInput",
      props: ["query", "onSearch"],
      description: "Search input to filter list items",
    });
  }

  if (shape === "object") {
    const hasEditableFields = fields.some(
      (f) => f.suggestedInput !== "image" && f.name !== "id"
    );

    suggestions.push({
      component: "DetailCard",
      props: fields.map((f) => f.name),
      description: `Detail view card showing all fields: ${fields.map((f) => f.name).join(", ")}`,
    });

    if (hasEditableFields) {
      suggestions.push({
        component: "EditForm",
        props: fields
          .filter((f) => f.name !== "id" && f.name !== "created_at")
          .map((f) => f.name),
        description: "Form to edit/update the resource",
      });
    }
  }

  return suggestions;
}

/**
 * Determines a human-readable page type based on data shape and field names.
 */
function suggestPageType(
  shape: DataShape,
  fields: FieldInfo[],
  itemFields?: FieldInfo[]
): string {
  const relevantFields = itemFields ?? fields;
  const hasImage = relevantFields.some((f) => f.suggestedInput === "image");

  switch (shape) {
    case "list":
      return hasImage ? "Gallery / Grid List Page" : "List / Index Page";
    case "paginated-list":
      return hasImage
        ? "Paginated Gallery Page"
        : "Paginated List / Dashboard Page";
    case "object":
      return "Detail / View Page";
    case "primitive":
      return "Simple Display Page";
    case "empty":
      return "Empty State Page";
    default:
      return "Generic Page";
  }
}

/**
 * Analyzes API response data and returns structured UI/component suggestions.
 */
export function analyzeApiResponse(data: unknown): ApiAnalysis {
  const schema = inferJsonSchema(data);
  const { shape, listData, objectData, listItemSchema, paginationFields } =
    detectShape(data, schema);

  let fields: FieldInfo[] = [];
  let itemFields: FieldInfo[] | undefined;

  if (shape === "list" && listData && listData.length > 0 && listItemSchema) {
    itemFields = extractFields(listItemSchema, listData[0]);
  } else if (shape === "paginated-list") {
    fields = extractFields(schema, objectData);
    if (listData && listData.length > 0 && listItemSchema) {
      itemFields = extractFields(listItemSchema, listData[0]);
    }
  } else if (shape === "object") {
    fields = extractFields(schema, objectData ?? data);
  }

  const suggestedComponents = suggestComponents(shape, fields, itemFields);
  const suggestedPageType = suggestPageType(shape, fields, itemFields);

  return {
    shape,
    fields,
    itemFields,
    totalItems: listData?.length,
    suggestedComponents,
    suggestedPageType,
    paginationFields,
  };
}
