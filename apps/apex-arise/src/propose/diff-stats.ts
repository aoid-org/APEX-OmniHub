/** Counts added/removed lines in a unified diff, excluding the +++/--- file headers. */
export function countChangedLines(patch: string): number {
  return patch
    .split("\n")
    .filter((line) => (line.startsWith("+") || line.startsWith("-")) && !line.startsWith("+++") && !line.startsWith("---"))
    .length;
}

export function makeBranchName(timestamp: string, random: () => number = Math.random): string {
  const fileDate = timestamp.slice(0, 10).replaceAll("-", "");
  const suffix = random().toString(36).slice(2, 8);
  return `arise/propose-redundancy-${fileDate}-${suffix}`;
}
