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

console.log("--- ORIGINAL INPUT ---");
console.log(realInput);
console.log("\nRunning Compression...");

const result = compress(realInput, { attentionSinks: ["APEX", "OmniHub"] });

console.log("\n--- COMPRESSED OUTPUT ---");
console.log(result.compressed);

console.log("\n--- COMPRESSION METRICS ---");
console.log("Original Tokens:", result.originalTokens);
console.log("Compressed Tokens:", result.compressedTokens);
console.log(`Reduction: ${result.reductionPct.toFixed(2)}%`);

console.log("\nTesting Semantic Cache...");
globalSemanticCache.set("test_key", "MOCKED_CACHED_RESPONSE");
const hit = globalSemanticCache.get("test_key");

console.log("Cache Hit Result:", hit);
