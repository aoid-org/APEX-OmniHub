import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartContainer } from "@/components/ui/chart";
import * as React from "react";

describe("ChartStyle Security", () => {
  it("should sanitize chart id to prevent XSS", () => {
    const maliciousId = '"><img src=x onerror=alert(1)>';
    const config = {
      test: { label: "Test", color: "red" },
    };

    const { container } = render(
      <ChartContainer id={maliciousId} config={config}>
        <div />
      </ChartContainer>
    );

    const styleTag = container.querySelector("style");
    expect(styleTag).toBeDefined();
    // The malicious characters should be stripped
    expect(styleTag?.innerHTML).not.toContain('">');
    expect(styleTag?.innerHTML).not.toContain('<img');

    // The div should also have a sanitized data-chart attribute
    const chartDiv = container.querySelector("[data-chart]");
    expect(chartDiv?.getAttribute("data-chart")).toBe("chart-imgsrcxonerroralert1");
  });

  it("should sanitize config keys to prevent CSS injection", () => {
    const maliciousKey = "test; } body { background: red; }";
    const config = {
      [maliciousKey]: { label: "Test", color: "red" },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>
    );

    const styleTag = container.querySelector("style");
    // Malicious characters should be stripped from the variable name
    expect(styleTag?.innerHTML).not.toContain("test; }");
    expect(styleTag?.innerHTML).toContain("--color-testbodybackgroundred");
  });

  it("should sanitize color values to prevent breaking out of CSS rules", () => {
    const maliciousColor = "red; } body { background: blue; }";
    const config = {
      test: { label: "Test", color: maliciousColor },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>
    );

    const styleTag = container.querySelector("style");
    expect(styleTag?.innerHTML).not.toContain("red; }");
    expect(styleTag?.innerHTML).toContain("--color-test: red body  background: blue  ;");
  });
});
