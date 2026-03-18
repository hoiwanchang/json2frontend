import { generateFrontendSpec } from "../src/specGenerator.js";
import { analyzeApiResponse } from "../src/analyzer.js";
import { inferJsonSchema } from "../src/schema.js";

const userList = [
  { id: 1, name: "Alice", email: "alice@example.com", active: true },
  { id: 2, name: "Bob", email: "bob@example.com", active: false },
];

describe("generateFrontendSpec – list", () => {
  const url = "https://api.example.com/users";
  const method = "GET";
  let spec: ReturnType<typeof generateFrontendSpec>;

  beforeAll(() => {
    const analysis = analyzeApiResponse(userList);
    const schema = inferJsonSchema(userList);
    spec = generateFrontendSpec(url, method, analysis, schema);
  });

  test("sets apiUrl and httpMethod", () => {
    expect(spec.apiUrl).toBe(url);
    expect(spec.httpMethod).toBe(method);
  });

  test("dataShape is list", () => {
    expect(spec.dataShape).toBe("list");
  });

  test("has components array", () => {
    expect(Array.isArray(spec.components)).toBe(true);
    expect(spec.components.length).toBeGreaterThan(0);
  });

  test("state variables include data and loading", () => {
    const varNames = spec.stateManagement.variables.map((v) => v.name);
    expect(varNames).toContain("data");
    expect(varNames).toContain("loading");
    expect(varNames).toContain("error");
  });

  test("state actions include fetchData", () => {
    expect(spec.stateManagement.actions.some((a) => a.includes("fetchData"))).toBe(true);
  });

  test("layout has Content section", () => {
    const sectionNames = spec.uiLayout.sections.map((s) => s.name);
    expect(sectionNames).toContain("Content");
  });

  test("suggests a tech stack", () => {
    expect(spec.suggestedTechStack.framework).toMatch(/react/i);
    expect(spec.suggestedTechStack.httpClient).toBeTruthy();
  });
});

describe("generateFrontendSpec – single object", () => {
  const url = "https://api.example.com/users/1";
  const method = "GET";
  const singleUser = { id: 1, name: "Alice", email: "alice@example.com" };

  test("dataShape is object", () => {
    const analysis = analyzeApiResponse(singleUser);
    const schema = inferJsonSchema(singleUser);
    const spec = generateFrontendSpec(url, method, analysis, schema);
    expect(spec.dataShape).toBe("object");
  });

  test("pageName derived from URL", () => {
    const analysis = analyzeApiResponse(singleUser);
    const schema = inferJsonSchema(singleUser);
    const spec = generateFrontendSpec(url, method, analysis, schema);
    expect(spec.pageName).toContain("1");
  });
});
