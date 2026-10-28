import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(?:[cm]?[jt]sx?)$/i.test(entry.name) ? [entryPath] : [];
  }));
  return nested.flat();
}

test("calculation code and runtime dependencies use no third-party calculation API client", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const dependencies = Object.keys(packageJson.dependencies ?? {});
  const apiClients = dependencies.filter((name) => /^(?:axios|got|node-fetch|request|superagent)$/i.test(name) || /(?:astrology|ephemeris).*(?:api|client)/i.test(name));
  assert.deepEqual(apiClients, [], "runtime dependencies must not include an outbound API client");

  const files = await sourceFiles("src/calculation");
  const remoteRequests = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (/\bfetch\s*\(\s*["'`]https?:\/\//i.test(content) || /\b(?:axios|got|node-fetch)\s*\(/i.test(content)) remoteRequests.push(file);
  }
  assert.deepEqual(remoteRequests, [], "calculation source must not request a third-party URL");
  assert.ok(dependencies.includes("@swisseph/node"), "the local Swiss Ephemeris binding must remain installed");
});
