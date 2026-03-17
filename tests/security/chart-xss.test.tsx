import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartContainer } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import * as React from "react";

describe("ChartStyle Security", () => {
  it("should sanitize chart id to prevent XSS", () => {
    const maliciousId = '"><img src=x onerror=alert(1)>';
    const config: ChartConfig = {
      test: { label: "Test", color: "red" },
    };

    const { container } = render(
      <ChartContainer id={maliciousId} config={config}>
        <div />
      </ChartContainer>,
    );

    const styleTag = container.querySelector("style");
    expect(styleTag).toBeDefined();
    const html = styleTag?.innerHTML ?? "";
    // The malicious characters should be stripped — no HTML tags or event handlers
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror=");
    expect(html).not.toContain("alert(");
    // Quotes must not break out of the data-chart attribute selector
    expect(html).not.toContain('data-chart="">');
    expect(html).not.toContain("<script>");

    // The div should also have a sanitized data-chart attribute
    const chartDiv = container.querySelector("[data-chart]");
    expect(chartDiv?.getAttribute("data-chart")).toBe("chart-imgsrcxonerroralert1");
  });

  it("should sanitize config keys to prevent CSS injection", () => {
    const maliciousKey = "test; } body { background: red; }";
    const config: ChartConfig = {
      [maliciousKey]: { label: "Test", color: "red" },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>,
    );

    const styleTag = container.querySelector("style");
    const html = styleTag?.innerHTML ?? "";
    // Malicious characters should be stripped from the variable name
    expect(html).not.toContain("test; }");
    expect(html).not.toContain("body {");
    expect(html).not.toContain("background:");
    // The key should be sanitized to safe characters only
    expect(html).toContain("--color-");
  });

  it("should sanitize color values to prevent breaking out of CSS rules", () => {
    const maliciousColor = "red; } body { background: blue; }";
    const config: ChartConfig = {
      test: { label: "Test", color: maliciousColor },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>,
    );

    const styleTag = container.querySelector("style");
    // The malicious color value should be completely rejected (not on allowlist)
    // so either no style tag or empty content
    if (styleTag) {
      const html = styleTag.innerHTML;
      expect(html).not.toContain("red; }");
      expect(html).not.toContain("background");
      expect(html).not.toContain("url(");
      expect(html).not.toContain("body {");
    }
  });
});
