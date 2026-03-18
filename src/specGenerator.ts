import type { ApiAnalysis, FieldInfo } from "./analyzer.js";
import type { JsonSchema } from "./schema.js";

export interface FrontendSpec {
  pageName: string;
  pageType: string;
  description: string;
  apiUrl: string;
  httpMethod: string;
  dataShape: string;
  schema: JsonSchema;
  components: ComponentSpec[];
  stateManagement: StateSpec;
  uiLayout: LayoutSpec;
  suggestedTechStack: TechStackSpec;
}

export interface ComponentSpec {
  name: string;
  type: string;
  props: PropSpec[];
  description: string;
}

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface StateSpec {
  variables: StateVariable[];
  actions: string[];
}

export interface StateVariable {
  name: string;
  type: string;
  initialValue: string;
}

export interface LayoutSpec {
  structure: string;
  sections: LayoutSection[];
}

export interface LayoutSection {
  name: string;
  description: string;
  components: string[];
}

export interface TechStackSpec {
  framework: string;
  uiLibrary: string;
  stateManagement: string;
  httpClient: string;
  reasoning: string;
}

/**
 * Maps a FieldInfo type to a TypeScript type string.
 */
function toTsType(field: FieldInfo): string {
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    integer: "number",
    boolean: "boolean",
    array: "unknown[]",
    object: "Record<string, unknown>",
    null: "null",
    unknown: "unknown",
    datetime: "string",
  };

  const base = typeMap[field.type] ?? "unknown";
  return field.nullable ? `${base} | null` : base;
}

/**
 * Generates component specs from analysis results.
 */
function buildComponentSpecs(analysis: ApiAnalysis): ComponentSpec[] {
  const relevantFields = analysis.itemFields ?? analysis.fields;

  return analysis.suggestedComponents.map((suggestion) => {
    const matchedFields = relevantFields.filter((f) =>
      suggestion.props.includes(f.name)
    );

    const props: PropSpec[] = [
      ...matchedFields.map((f) => ({
        name: f.name,
        type: toTsType(f),
        required: !f.nullable,
        description: `${f.name} field from API response`,
      })),
      // Add callback/control props for interactive components
      ...(suggestion.component === "SearchInput"
        ? [
            {
              name: "onSearch",
              type: "(query: string) => void",
              required: true,
              description: "Callback invoked when user submits a search",
            },
          ]
        : []),
      ...(suggestion.component === "Pagination"
        ? [
            {
              name: "currentPage",
              type: "number",
              required: true,
              description: "Current active page number (1-based)",
            },
            {
              name: "totalPages",
              type: "number",
              required: true,
              description: "Total number of pages",
            },
            {
              name: "onPageChange",
              type: "(page: number) => void",
              required: true,
              description: "Callback invoked when user selects a page",
            },
          ]
        : []),
    ];

    return {
      name: suggestion.component,
      type: "functional",
      props,
      description: suggestion.description,
    };
  });
}

/**
 * Generates state management spec based on analysis.
 */
function buildStateSpec(analysis: ApiAnalysis): StateSpec {
  const relevantFields = analysis.itemFields ?? analysis.fields;

  const variables: StateVariable[] = [
    {
      name: "data",
      type:
        analysis.shape === "list" || analysis.shape === "paginated-list"
          ? `Array<{${relevantFields.map((f) => `${f.name}: ${toTsType(f)}`).join("; ")}}>`
          : `{${relevantFields.map((f) => `${f.name}: ${toTsType(f)}`).join("; ")}} | null`,
      initialValue:
        analysis.shape === "list" || analysis.shape === "paginated-list"
          ? "[]"
          : "null",
    },
    { name: "loading", type: "boolean", initialValue: "false" },
    { name: "error", type: "string | null", initialValue: "null" },
  ];

  if (analysis.shape === "paginated-list") {
    variables.push({ name: "currentPage", type: "number", initialValue: "1" });
    variables.push({
      name: "totalPages",
      type: "number",
      initialValue: "1",
    });
  }

  const searchable = relevantFields.some(
    (f) => f.type === "string" && f.suggestedInput === "text"
  );
  if (searchable) {
    variables.push({ name: "searchQuery", type: "string", initialValue: '""' });
  }

  const actions = [
    "fetchData(url: string): Promise<void>",
    "handleError(err: unknown): void",
  ];

  if (analysis.shape === "paginated-list") {
    actions.push("goToPage(page: number): void");
  }

  if (searchable) {
    actions.push("handleSearch(query: string): void");
  }

  return { variables, actions };
}

/**
 * Generates a UI layout spec.
 */
function buildLayoutSpec(
  analysis: ApiAnalysis,
  componentSpecs: ComponentSpec[]
): LayoutSpec {
  const structure =
    analysis.shape === "list" || analysis.shape === "paginated-list"
      ? "full-width-list"
      : "centered-card";

  const componentNames = componentSpecs.map((c) => c.name);

  const sections: LayoutSection[] = [];

  // Header
  sections.push({
    name: "Header",
    description: "Page title, breadcrumbs, and primary action buttons",
    components: [],
  });

  // Controls
  const controlComponents = componentNames.filter((n) =>
    ["SearchInput", "FilterBar", "DateRangePicker"].includes(n)
  );
  if (controlComponents.length > 0) {
    sections.push({
      name: "Controls",
      description: "Search, filter, and sort controls",
      components: controlComponents,
    });
  }

  // Main content
  const contentComponents = componentNames.filter((n) =>
    ["DataTable", "CardGrid", "DetailCard", "EditForm"].includes(n)
  );
  sections.push({
    name: "Content",
    description: "Primary data display area",
    components: contentComponents,
  });

  // Footer controls
  const footerComponents = componentNames.filter((n) =>
    ["Pagination"].includes(n)
  );
  if (footerComponents.length > 0) {
    sections.push({
      name: "Footer",
      description: "Pagination and additional navigation",
      components: footerComponents,
    });
  }

  return { structure, sections };
}

/**
 * Suggests a tech stack based on the page type and complexity.
 */
function suggestTechStack(analysis: ApiAnalysis): TechStackSpec {
  const isComplex =
    analysis.shape === "paginated-list" ||
    (analysis.fields.length + (analysis.itemFields?.length ?? 0)) > 10;

  return {
    framework: "React 18+",
    uiLibrary: isComplex ? "Ant Design or Material-UI" : "shadcn/ui or Tailwind CSS",
    stateManagement: isComplex ? "TanStack Query (React Query)" : "useState + useEffect",
    httpClient: "axios or fetch API",
    reasoning: isComplex
      ? "Complex paginated/filtered data benefits from TanStack Query for caching and Ant Design for rich table/form components."
      : "Simple data shapes work well with lightweight hooks and a utility-first CSS library like Tailwind.",
  };
}

/**
 * Generates a complete frontend page specification from API analysis.
 */
export function generateFrontendSpec(
  apiUrl: string,
  httpMethod: string,
  analysis: ApiAnalysis,
  schema: JsonSchema
): FrontendSpec {
  const componentSpecs = buildComponentSpecs(analysis);
  const stateSpec = buildStateSpec(analysis);
  const layoutSpec = buildLayoutSpec(analysis, componentSpecs);
  const techStack = suggestTechStack(analysis);

  const urlParts = apiUrl.split("/").filter(Boolean);
  const resourceName =
    urlParts[urlParts.length - 1]
      ?.replace(/[^a-zA-Z0-9]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Resource";

  return {
    pageName: `${resourceName} Page`,
    pageType: analysis.suggestedPageType,
    description: `Auto-generated frontend spec for ${httpMethod} ${apiUrl}. This is a ${analysis.suggestedPageType.toLowerCase()}.`,
    apiUrl,
    httpMethod,
    dataShape: analysis.shape,
    schema,
    components: componentSpecs,
    stateManagement: stateSpec,
    uiLayout: layoutSpec,
    suggestedTechStack: techStack,
  };
}
