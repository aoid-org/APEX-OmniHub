import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { ChartContainer } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

describe("ChartStyle Security", () => {
  it("should sanitize chart id to prevent XSS", () => {
    const config: ChartConfig = {
      value: { color: "#ff0000" },
    };

    // XSS payload as chart id
    const { container } = render(
      <ChartContainer id={'"><script>alert(1)</script>'} config={config}>
        <></>
      </ChartContainer>,
    );

    const style = container.querySelector("style");
    expect(style).not.toBeNull();
    const html = style?.innerHTML ?? "";
    // The raw XSS payload characters must not appear in the emitted CSS
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain("</script>");
  });

  it("should sanitize config keys to prevent CSS injection", () => {
    const config: ChartConfig = {
      // Key contains } and CSS payload that would break out of CSS block if unsanitized
      "key}body{background:red;--x": { color: "#00ff00" },
    };

    const { container } = render(
      <ChartContainer id="safe-id" config={config}>
        <></>
      </ChartContainer>,
    );

    const style = container.querySelector("style");
    expect(style).not.toBeNull();
    const html = style?.innerHTML ?? "";
    // The injection payload must not appear in the CSS variable name
    expect(html).not.toContain("body{");
    expect(html).not.toContain("background:red");
  });

  it("should sanitize color values to prevent breaking out of CSS rules", () => {
    const config: ChartConfig = {
      value: { color: "red; } body { background: url(evil)" },
    };

    const { container } = render(
      <ChartContainer id="safe-id" config={config}>
        <></>
      </ChartContainer>,
    );

    const style = container.querySelector("style");
    // Either the style is null (no valid declarations) or it doesn't contain the injection
    if (style) {
      const html = style.innerHTML;
      expect(html).not.toContain("url(");
      expect(html).not.toContain("body {");
      expect(html).not.toContain("background:");
    }
  });
});
