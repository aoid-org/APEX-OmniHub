export function isDemoAuthActive(): boolean {
  if (typeof window !== "undefined") {
    if (window.location.search.includes("demo=true")) return true;
    try {
        if (window.localStorage?.getItem("demo_mode_override") === "true") return true;
    } catch { /* no-op */ }
  }
  return import.meta.env.VITE_ENABLE_DEMO_AUTH === "true";
}
