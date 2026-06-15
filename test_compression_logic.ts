import { compress } from "./supabase/functions/_shared/compress.ts";
import { globalSemanticCache } from "./supabase/functions/_shared/semantic-cache.ts";

const realInput = `
You are an APEX-OmniHub AI assistant.
Please note that this is a test prompt.
It is important to note that you must follow instructions.
Feel free to ask questions.
As an AI language model, absolutely you must help.
This parameter specifies how to test.
`;

console.warn("--- ORIGINAL INPUT ---");
console.warn(realInput);
console.warn("\nRunning Compression...");

const result = compress(realInput, { attentionSinks: ["APEX", "OmniHub"] });

console.warn("\n--- COMPRESSED OUTPUT ---");
console.warn(result.compressed);

console.warn("\n--- COMPRESSION METRICS ---");
console.warn("Original Tokens:", result.originalTokens);
console.warn("Compressed Tokens:", result.compressedTokens);
console.warn(`Reduction: ${result.reductionPct.toFixed(2)}%`);

console.warn("\nTesting Semantic Cache...");
globalSemanticCache.set("test_key", "MOCKED_CACHED_RESPONSE");
const hit = globalSemanticCache.get("test_key");

console.warn("Cache Hit Result:", hit);
