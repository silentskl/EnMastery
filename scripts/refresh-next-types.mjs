#!/usr/bin/env node
/**
 * Next.js emits .next/types/validator.ts from app/ routes.
 * Removed routes are still present in a developer's local .next cache after
 * pulling the PSLE-only refactor. Refresh the *generated types only* before
 * running tsc, without touching databases, assets, deployment config or the
 * rest of Next's build cache.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const typesDir = join(root, ".next", "types");

for (const path of [typesDir, join(root, ".next", "dev", "types")]) {
  rmSync(path, { recursive: true, force: true });
}

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextCli)) {
  console.error("[typecheck] Next.js CLI not found. Install dependencies first.");
  process.exit(1);
}

console.log("[typecheck] Regenerating Next.js route types from current app/ source...");
execFileSync(process.execPath, [nextCli, "typegen"], { cwd: root, stdio: "inherit" });

const validator = join(typesDir, "validator.ts");
if (!existsSync(validator)) {
  console.error("[typecheck] Next.js did not regenerate .next/types/validator.ts");
  process.exit(1);
}

// Fail explicitly if a future Next version generates a route map that refers
// to files which were removed from this PSLE-only product.
const source = readFileSync(validator, "utf8");
const missing = new Set();
for (const match of source.matchAll(/import\("(\.\.\/\.\.\/app\/[^"]+)\.js"\)/g)) {
  const base = resolve(typesDir, match[1]);
  if (![".ts", ".tsx", ".js", ".jsx"].some(ext => existsSync(base + ext))) {
    missing.add(match[1] + ".js");
  }
}
if (missing.size) {
  console.error("[typecheck] Generated route validator references removed files:\n" +
    [...missing].join("\n"));
  process.exit(1);
}
console.log("[typecheck] Next.js route types are fresh.");
