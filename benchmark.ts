const NUM_ITEMS = 100;

async function mockProcessRequestItem(item: any, index: number): Promise<any> {
  // simulate DB latency of 20ms
  await new Promise(r => setTimeout(r, 20));
  return { status: "success", index };
}

async function runSequential() {
  const items = Array(NUM_ITEMS).fill({});
  const start = performance.now();
  const results = [];
  for (const [index, item] of items.entries()) {
    const result = await mockProcessRequestItem(item, index);
    results.push(result);
  }
  const end = performance.now();
  console.log(`Sequential: ${end - start}ms`);
}

async function runConcurrent() {
  const items = Array(NUM_ITEMS).fill({});
  const start = performance.now();
  const results = await Promise.all(
    items.map((item, index) => mockProcessRequestItem(item, index))
  );
  const end = performance.now();
  console.log(`Concurrent: ${end - start}ms`);
}

async function main() {
  await runSequential();
  await runConcurrent();
}

main();
