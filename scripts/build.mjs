import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateSourceFingerprint } from "./launch-readiness-fingerprint.mjs";

const sourceFingerprint = await calculateSourceFingerprint();
await rm(path.resolve(".next"), { recursive: true, force: true });
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
const standalone = path.resolve(".next/standalone");
for (const entry of await readdir(standalone)) {
  if (/^\.env(?:\..*)?$/.test(entry)) {
    await rm(path.join(standalone, entry), { force: true });
  }
}
await mkdir(path.join(standalone, ".next"), { recursive: true });
await cp(path.resolve(".next/static"), path.join(standalone, ".next/static"), { recursive: true, force: true });
await cp(path.resolve("public"), path.join(standalone, "public"), { recursive: true, force: true });
await writeFile(
  path.join(standalone, "launch-readiness-build.json"),
  `${JSON.stringify({ sourceFingerprint, builtAt: new Date().toISOString() }, null, 2)}\n`,
);
try {
  const verificationPath = path.resolve("data/verification/latest.json");
  await readFile(verificationPath);
  await mkdir(path.join(standalone, "data/verification"), { recursive: true });
  await cp(verificationPath, path.join(standalone, "data/verification/latest.json"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
