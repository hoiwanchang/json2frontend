import { inferJsonSchema } from "../src/schema.js";

describe("inferJsonSchema", () => {
  test("null returns nullable null type", () => {
    expect(inferJsonSchema(null)).toEqual({ type: "null", nullable: true });
  });

  test("boolean value", () => {
    expect(inferJsonSchema(true)).toEqual({ type: "boolean", example: true });
  });

  test("integer value", () => {
    expect(inferJsonSchema(42)).toEqual({ type: "integer", example: 42 });
  });

  test("float value", () => {
    expect(inferJsonSchema(3.14)).toEqual({ type: "number", example: 3.14 });
  });

  test("string value", () => {
    expect(inferJsonSchema("hello")).toEqual({
      type: "string",
      example: "hello",
    });
  });

  test("array of strings", () => {
    const result = inferJsonSchema(["a", "b"]);
    expect(result.type).toBe("array");
    expect(result.items).toEqual({ type: "string", example: "a" });
  });

  test("empty array", () => {
    const result = inferJsonSchema([]);
    expect(result.type).toBe("array");
    expect(result.items).toEqual({ type: "unknown" });
  });

  test("simple object", () => {
    const result = inferJsonSchema({ id: 1, name: "Alice" });
    expect(result.type).toBe("object");
    expect(result.properties?.id).toEqual({ type: "integer", example: 1 });
    expect(result.properties?.name).toEqual({
      type: "string",
      example: "Alice",
    });
  });

  test("nested object", () => {
    const result = inferJsonSchema({ user: { id: 1 } });
    expect(result.type).toBe("object");
    expect(result.properties?.user.type).toBe("object");
    expect(result.properties?.user.properties?.id).toEqual({
      type: "integer",
      example: 1,
    });
  });
});
