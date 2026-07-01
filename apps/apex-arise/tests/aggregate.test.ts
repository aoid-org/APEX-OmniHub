import { describe, expect, it } from "vitest";
import { computeComposite } from "../src/aggregate.js";

describe("computeComposite", () => {
  it("computes the geometric mean of five known inputs", () => {
    const result = computeComposite({
      acyclicity: 1,
      modularity: 1,
      redundancy: 1,
      depth: 1,
      equality: 1,
    });
    expect(result).toBeCloseTo(1, 10);
  });

  it("computes a known non-trivial geometric mean", () => {
    // geometric mean of 0.5, 0.5, 0.5, 0.5, 0.5 is 0.5
    const result = computeComposite({
      acyclicity: 0.5,
      modularity: 0.5,
      redundancy: 0.5,
      depth: 0.5,
      equality: 0.5,
    });
    expect(result).toBeCloseTo(0.5, 10);
  });

  it("exhibits the zero-collapse property: any single zero input yields a zero composite", () => {
    const result = computeComposite({
      acyclicity: 1,
      modularity: 1,
      redundancy: 0,
      depth: 1,
      equality: 1,
    });
    expect(result).toBe(0);
  });

  it("fails loudly rather than defaulting when a signal is missing", () => {
    expect(() =>
      computeComposite({
        acyclicity: 1,
        modularity: 1,
        redundancy: 1,
        depth: 1,
        // equality intentionally omitted
      }),
    ).toThrow(/equality/);
  });

  it("fails loudly on a NaN signal instead of silently substituting a default", () => {
    expect(() =>
      computeComposite({
        acyclicity: 1,
        modularity: Number.NaN,
        redundancy: 1,
        depth: 1,
        equality: 1,
      }),
    ).toThrow(/modularity/);
  });

  it("fails loudly on an out-of-range signal", () => {
    expect(() =>
      computeComposite({
        acyclicity: 1,
        modularity: 1,
        redundancy: 1.5,
        depth: 1,
        equality: 1,
      }),
    ).toThrow(/out-of-range/);
  });
});
