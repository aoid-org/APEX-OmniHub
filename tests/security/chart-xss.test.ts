import { describe, expect, it } from "vitest";

// Mock the regex sanitization logic from ChartStyle and ChartContainer
const sanitizeChartId = (id: string, uniqueId: string) =>
  `chart-${id || uniqueId.replace(/:/g, "")}`.replace(/[^a-zA-Z0-9-_]/g, "");

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9-_]/g, "");

const sanitizeColor = (color: string) => color.replace(/[;{}]/g, "").replace(/<\/style>/gi, "");

describe("Chart Component Sanitization Logic", () => {
  it("should sanitize chart id to prevent XSS breakout", () => {
    const maliciousId = '"><img src=x onerror=alert(1)>';
    const sanitizedId = sanitizeChartId(maliciousId, "test-uid");

    // The result should be safe for use in data-chart attribute and CSS selector
    expect(sanitizedId).not.toContain('">');
    expect(sanitizedId).not.toContain('<img');
    expect(sanitizedId).toBe("chart-imgsrcxonerroralert1");
  });

  it("should sanitize config keys to prevent CSS injection", () => {
    const maliciousKey = "test; } body { background: red; }";
    const sanitizedKey = sanitizeKey(maliciousKey);

    expect(sanitizedKey).not.toContain(";");
    expect(sanitizedKey).not.toContain("}");
    expect(sanitizedKey).not.toContain("{");
    expect(sanitizedKey).toBe("testbodybackgroundred");
  });

  it("should sanitize color values to prevent breaking out of CSS rules", () => {
    const maliciousColor = "red; } body { background: blue; } </style>";
    const sanitizedColor = sanitizeColor(maliciousColor);

    // Should remove characters that allow breaking out of the CSS block
    expect(sanitizedColor).not.toContain(";");
    expect(sanitizedColor).not.toContain("}");
    expect(sanitizedColor).not.toContain("{");
    expect(sanitizedColor).not.toContain("</style>");

    expect(sanitizedColor).toBe("red  body  background: blue  ");
  });
});
