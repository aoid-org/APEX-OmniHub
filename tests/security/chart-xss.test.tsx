import { render } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle } from '../../src/components/ui/chart';

class ResizeObserverMock {
  observe() { /* mock */ }
  unobserve() { /* mock */ }
  disconnect() { /* mock */ }
}

describe("ChartStyle Security", () => {
  beforeEach(() => {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
  });

  it("should sanitize chart id to prevent XSS", () => {
    const maliciousId = '"><img src=x onerror=alert(1)>';
    const config = {
      test: { label: "Test", color: "#ff0000" },
    };

    const { container } = render(
      <ChartContainer id={maliciousId} config={config}>
        <div />
      </ChartContainer>,
    );

    const chartDiv = container.querySelector<HTMLElement>("[data-chart]");
    const dataChart = chartDiv?.dataset.chart ?? "";
    expect(dataChart).not.toContain('"');
    expect(dataChart).not.toContain("<");
    expect(dataChart).not.toContain(">");
    expect(dataChart).not.toContain("=");
    expect(dataChart).toMatch(/^chart-[a-zA-Z0-9_-]+$/);

    const styleTag = container.querySelector("style");
    expect(styleTag?.textContent).not.toContain("<img");
    expect(styleTag?.textContent).not.toContain("onerror=");
  });

  it("should sanitize config keys to prevent CSS injection", () => {
    const maliciousKey = "test; } body { background: red; }";
    const config = {
      [maliciousKey]: { label: "Test", color: "#ff0000" },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>,
    );

    const styleTag = container.querySelector("style");
    expect(styleTag?.textContent).not.toContain("test; }");
    expect(styleTag?.textContent).not.toContain("body {");
    expect(styleTag?.textContent).toContain("--color-test");
  });

  it("should reject malicious color values via allowlist", () => {
    const maliciousColor = "red; } body { background: blue; }";
    const config = {
      test: { label: "Test", color: maliciousColor },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>,
    );

    const styleTag = container.querySelector("style");
    expect(styleTag?.textContent ?? "").not.toContain("background: blue");
    expect(styleTag?.textContent ?? "").not.toContain(maliciousColor);
  });

  it("should accept valid hex, rgb, hsl, and named color values", () => {
    const config = {
      hex: { label: "Hex", color: "#ff0000" },
      named: { label: "Named", color: "blue" },
      rgb: { label: "RGB", color: "rgb(255, 0, 0)" },
      hsl: { label: "HSL", color: "hsl(120, 50%, 50%)" },
      cssvar: { label: "Var", color: "var(--primary)" },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>,
    );

    const styleTag = container.querySelector("style");
    const css = styleTag?.textContent ?? "";
    expect(css).toContain("--color-hex: #ff0000;");
    expect(css).toContain("--color-named: blue;");
    expect(css).toContain("--color-rgb: rgb(255, 0, 0);");
    expect(css).toContain("--color-hsl: hsl(120, 50%, 50%);");
    expect(css).toContain("--color-cssvar: var(--primary);");
  });

  it("should reject url(), expression(), and other CSS function injection vectors", () => {
    const config = {
      urlAttack: { label: "URL", color: "url(javascript:alert(1))" },
      exprAttack: { label: "Expr", color: "expression(alert(1))" },
      calcAttack: { label: "Calc", color: "calc(100% - 20px)" },
    };

    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>,
    );

    const styleTag = container.querySelector("style");
    const css = styleTag?.textContent ?? "";
    expect(css).not.toContain("url(");
    expect(css).not.toContain("expression(");
    expect(css).not.toContain("calc(");
  });
});
