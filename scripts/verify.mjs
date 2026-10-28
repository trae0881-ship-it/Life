import { spawnSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { calculateSourceFingerprint } from "./launch-readiness-fingerprint.mjs";

const startedAt = new Date().toISOString();
const runId = randomUUID();
const sourceFingerprint = await calculateSourceFingerprint();
const checks = [];
const npm = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const commands = [
  ["npm test", ["test"]],
  ["npx tsc --noEmit", ["exec", "tsc", "--noEmit"]],
  ["npx prisma validate", ["exec", "prisma", "validate"]],
  ["npm run build", ["run", "build"]],
];
for (const [command, args] of commands) {
  const checkStarted = new Date().toISOString();
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", `npm.cmd ${args.join(" ")}`] : args;
  const result = spawnSync(npm, commandArgs, { encoding: "utf8", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, maxBuffer: 20 * 1024 * 1024 });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const output = `${stdout}\n${stderr}`;
  const exitCode = result.status ?? 1;
  const testCounts = command === "npm test"
    ? {
      tests: Number(output.match(/^# tests (\d+)$/m)?.[1] ?? 0),
      passed: Number(output.match(/^# pass (\d+)$/m)?.[1] ?? 0),
      failed: Number(output.match(/^# fail (\d+)$/m)?.[1] ?? 0),
    }
    : undefined;
  checks.push({
    command,
    status: exitCode === 0 ? "PASS" : "FAIL",
    exitCode,
    startedAt: checkStarted,
    completedAt: new Date().toISOString(),
    ...(testCounts ? { testCounts } : {}),
  });
  const report = { format: "life-verification-run-v1", version: "life-verification-1.0.0", runId, sourceFingerprint, evidenceFresh: false, environment: `${process.platform}-${process.arch}; Node ${process.version}`, startedAt, completedAt: new Date().toISOString(), checks };
  await mkdir("data/verification", { recursive: true });
  await writeFile("data/verification/latest.json", `${JSON.stringify(report, null, 2)}\n`);
  if (exitCode !== 0) process.exitCode = exitCode;
}
const sourceFingerprintAfter = await calculateSourceFingerprint();
const finalReport = {
  format: "life-verification-run-v1",
  version: "life-verification-1.0.0",
  runId,
  sourceFingerprint,
  evidenceFresh: sourceFingerprint === sourceFingerprintAfter,
  environment: `${process.platform}-${process.arch}; Node ${process.version}`,
  startedAt,
  completedAt: new Date().toISOString(),
  checks,
};
await writeFile("data/verification/latest.json", `${JSON.stringify(finalReport, null, 2)}\n`);
try { await mkdir(".next/standalone/data/verification", { recursive: true }); await copyFile("data/verification/latest.json", ".next/standalone/data/verification/latest.json"); } catch { /* Build output can be absent when an earlier command failed. */ }
if (process.exitCode) process.exit(process.exitCode);
