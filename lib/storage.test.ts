import { describe, expect, it } from "vitest";

import { validateFile } from "./storage";

describe("validateFile", () => {
  it("accepts a valid PDF under the size limit", () => {
    const buffer = Buffer.from("%PDF-1.4\n%");
    const result = validateFile(buffer, "resume.pdf", "application/pdf");

    expect(result).toEqual({ valid: true });
  });

  it("rejects an invalid extension", () => {
    const buffer = Buffer.from("%PDF-1.4\n%");
    const result = validateFile(buffer, "resume.txt", "application/pdf");

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/extension/i);
  });

  it("rejects a file exceeding the 10MB limit", () => {
    const buffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    const result = validateFile(buffer, "resume.pdf", "application/pdf");

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/10MB/i);
  });
});
