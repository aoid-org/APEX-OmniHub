import { Node, Project, SyntaxKind } from "ts-morph";
import path from "node:path";
import type { SignalScore } from "../types.js";

const CONTROL_FLOW_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.SwitchStatement,
  SyntaxKind.TryStatement,
  SyntaxKind.CatchClause,
]);

const DEPTH_THRESHOLD = 4;
// Matches this repo's own CLAUDE.md modularity convention: "Maximum file length is 600 lines."
const LOC_OUTLIER_THRESHOLD = 600;

function maxNestingDepth(node: Node, currentDepth: number): number {
  let max = currentDepth;
  node.forEachChild((child) => {
    const childDepth = CONTROL_FLOW_KINDS.has(child.getKind()) ? currentDepth + 1 : currentDepth;
    const childMax = maxNestingDepth(child, childDepth);
    if (childMax > max) max = childMax;
  });
  return max;
}

export function collectStructural(scanTargets: string[], repoRoot: string): [SignalScore, SignalScore] {
  const project = new Project({ skipAddingFilesFromTsConfig: true, skipFileDependencyResolution: true });
  for (const target of scanTargets) {
    project.addSourceFilesAtPaths(path.join(repoRoot, target, "**/*.{ts,tsx}"));
  }
  const files = project.getSourceFiles().filter((f) => !f.getFilePath().includes("node_modules"));

  let overallMaxDepth = 0;
  let overallMaxDepthFile = "";
  let filesOverDepthThreshold = 0;

  let largestFile = "";
  let largestFileLoc = 0;
  let filesOverLocThreshold = 0;
  let totalLoc = 0;

  for (const file of files) {
    const depth = maxNestingDepth(file, 0);
    if (depth > overallMaxDepth) {
      overallMaxDepth = depth;
      overallMaxDepthFile = path.relative(repoRoot, file.getFilePath());
    }
    if (depth > DEPTH_THRESHOLD) filesOverDepthThreshold++;

    const loc = file.getEndLineNumber();
    totalLoc += loc;
    if (loc > largestFileLoc) {
      largestFileLoc = loc;
      largestFile = path.relative(repoRoot, file.getFilePath());
    }
    if (loc > LOC_OUTLIER_THRESHOLD) filesOverLocThreshold++;
  }

  const depthScore = 1 / (1 + filesOverDepthThreshold);
  const equalityScore = 1 / (1 + filesOverLocThreshold);

  const depthSignal: SignalScore = {
    name: "depth",
    raw:
      files.length === 0
        ? "no files scanned"
        : `max nesting depth ${overallMaxDepth} in ${overallMaxDepthFile}; ${filesOverDepthThreshold} file(s) exceed depth ${DEPTH_THRESHOLD}`,
    score: depthScore,
    methodNote: `score = 1 / (1 + filesOverThreshold); a file counts if its deepest control-flow nesting (if/for/while/switch/try/catch) exceeds ${DEPTH_THRESHOLD}, computed via ts-morph AST traversal.`,
  };

  const equalitySignal: SignalScore = {
    name: "equality",
    raw:
      files.length === 0
        ? "no files scanned"
        : `largest file ${largestFile} (${largestFileLoc} LOC); ${filesOverLocThreshold} file(s) exceed ${LOC_OUTLIER_THRESHOLD} LOC across ${files.length} files (avg ${(totalLoc / files.length).toFixed(0)} LOC)`,
    score: equalityScore,
    methodNote: `score = 1 / (1 + filesOverThreshold); a file counts as a monolithic outlier if its LOC exceeds ${LOC_OUTLIER_THRESHOLD} (matching this repo's own CLAUDE.md modularity convention), computed via ts-morph.`,
  };

  return [depthSignal, equalitySignal];
}
