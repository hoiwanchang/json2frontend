import { analyzeApiResponse } from "../src/analyzer.js";

const userList = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    active: true,
    created_at: "2024-01-01",
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
    active: false,
    created_at: "2024-01-02",
  },
];

const paginatedUsers = {
  items: userList,
  total: 2,
  page: 1,
  pages: 1,
};

const singleUser = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  active: true,
  created_at: "2024-01-01",
};

describe("analyzeApiResponse – list", () => {
  test("detects list shape", () => {
    const result = analyzeApiResponse(userList);
    expect(result.shape).toBe("list");
  });

  test("extracts item fields", () => {
    const result = analyzeApiResponse(userList);
    const fieldNames = result.itemFields?.map((f) => f.name) ?? [];
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("email");
    expect(fieldNames).toContain("active");
  });

  test("suggests DataTable component for list", () => {
    const result = analyzeApiResponse(userList);
    const componentNames = result.suggestedComponents.map((c) => c.component);
    expect(componentNames).toContain("DataTable");
  });

  test("suggests SearchInput for list", () => {
    const result = analyzeApiResponse(userList);
    const componentNames = result.suggestedComponents.map((c) => c.component);
    expect(componentNames).toContain("SearchInput");
  });

  test("page type is List/Index", () => {
    const result = analyzeApiResponse(userList);
    expect(result.suggestedPageType).toMatch(/list/i);
  });
});

describe("analyzeApiResponse – paginated list", () => {
  test("detects paginated-list shape", () => {
    const result = analyzeApiResponse(paginatedUsers);
    expect(result.shape).toBe("paginated-list");
  });

  test("detects pagination fields", () => {
    const result = analyzeApiResponse(paginatedUsers);
    expect(result.paginationFields).toBeDefined();
    expect(result.paginationFields?.length).toBeGreaterThan(0);
  });

  test("suggests Pagination component", () => {
    const result = analyzeApiResponse(paginatedUsers);
    const componentNames = result.suggestedComponents.map((c) => c.component);
    expect(componentNames).toContain("Pagination");
  });
});

describe("analyzeApiResponse – single object", () => {
  test("detects object shape", () => {
    const result = analyzeApiResponse(singleUser);
    expect(result.shape).toBe("object");
  });

  test("extracts fields from object", () => {
    const result = analyzeApiResponse(singleUser);
    const fieldNames = result.fields.map((f) => f.name);
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("email");
  });

  test("suggests DetailCard for object", () => {
    const result = analyzeApiResponse(singleUser);
    const componentNames = result.suggestedComponents.map((c) => c.component);
    expect(componentNames).toContain("DetailCard");
  });

  test("page type is Detail/View", () => {
    const result = analyzeApiResponse(singleUser);
    expect(result.suggestedPageType).toMatch(/detail/i);
  });
});

describe("analyzeApiResponse – null / empty", () => {
  test("handles null data", () => {
    const result = analyzeApiResponse(null);
    expect(result.shape).toBe("empty");
  });

  test("handles undefined data", () => {
    const result = analyzeApiResponse(undefined);
    expect(result.shape).toBe("empty");
  });
});

describe("analyzeApiResponse – email and image field heuristics", () => {
  test("detects email input type", () => {
    const result = analyzeApiResponse([{ id: 1, email: "a@b.com" }]);
    const emailField = result.itemFields?.find((f) => f.name === "email");
    expect(emailField?.suggestedInput).toBe("email");
  });

  test("detects image field and suggests CardGrid", () => {
    const result = analyzeApiResponse([{ id: 1, avatar: "http://img.com/1.png" }]);
    const componentNames = result.suggestedComponents.map((c) => c.component);
    expect(componentNames).toContain("CardGrid");
  });
});
