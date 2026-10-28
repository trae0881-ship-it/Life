import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = [
  "src",
  "tests",
  "prisma/migrations",
  "scripts",
];
const FILES = [
  "package.json",
  "next.config.ts",
  "prisma.config.ts",
  "prisma/schema.prisma",
  "tsconfig.json",
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

export async function calculateSourceFingerprint(root = process.cwd()) {
  const hash = createHash("sha256");
  const paths = [...FILES.map((file) => path.join(root, file))];
  for (const relativeRoot of ROOTS) {
    const directory = path.join(root, relativeRoot);
    paths.push(...await listFiles(directory));
  }

  paths.sort((left, right) => left.localeCompare(right));
  for (const filePath of paths) {
    const relativePath = path.relative(root, filePath).replaceAll("\\", "/");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}
