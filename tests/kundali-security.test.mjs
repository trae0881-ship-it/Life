import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ownedRecordWhere } from "../src/server/ownership.ts";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Kundali RLS migration enables owner policies and routes set a transaction-local user scope", () => {
  const migration = source("../prisma/migrations/20261123140000_kundali_documents/migration.sql");
  const storage = source("../src/server/kundali-storage.ts");
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  for (const command of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.match(migration, new RegExp(`FOR ${command}`));
  }
  assert.match(migration, /FOR SELECT\s+USING \("userId" = current_setting\('life\.user_id', true\)\)/);
  assert.match(migration, /FOR INSERT\s+WITH CHECK \("userId" = current_setting\('life\.user_id', true\)\)/);
  assert.match(migration, /FOR UPDATE\s+USING \("userId" = current_setting\('life\.user_id', true\)\)\s+WITH CHECK \("userId" = current_setting\('life\.user_id', true\)\)/);
  assert.match(migration, /FOR DELETE\s+USING \("userId" = current_setting\('life\.user_id', true\)\)/);
  assert.match(storage, /\$transaction\(async \(transaction\)/);
  assert.match(storage, /set_config\('life\.user_id', \$\{userId\}, true\)/);
});

test("owner-scoped IDs do not authorize a different LIFE account", () => {
  const documentId = "abcdefgh123456789012345678901234";
  assert.deepEqual(ownedRecordWhere("account-a", documentId), { id: documentId, userId: "account-a" });
  assert.notDeepEqual(ownedRecordWhere("account-a", documentId), ownedRecordWhere("account-b", documentId));
});

test("upload, listing, original download, and deletion require a session and ownership-scoped database operations", () => {
  const upload = source("../src/app/api/kundalis/route.ts");
  const deletion = source("../src/app/api/kundalis/[kundaliId]/route.ts");
  const download = source("../src/app/api/kundalis/[kundaliId]/original/route.ts");
  for (const route of [upload, deletion, download]) assert.match(route, /getUserFromRequest\(request\)/);
  assert.match(upload, /isSameOriginMutation\(request\)/);
  assert.match(deletion, /isSameOriginMutation\(request\)/);
  assert.match(upload, /withKundaliDatabaseUser\(user\.id/);
  assert.match(deletion, /ownedRecordWhere\(user\.id, kundaliId\)/);
  assert.match(download, /ownedRecordWhere\(user\.id, kundaliId\)/);
  assert.match(download, /Content-Disposition.*attachment/);
  assert.match(download, /X-Content-Type-Options.*nosniff/);
  assert.match(download, /Cache-Control.*private, no-store/);
});

test("the stored original is returned as an attachment, while OCR and AI do not consume untrusted document content", () => {
  const download = source("../src/app/api/kundalis/[kundaliId]/original/route.ts");
  const upload = source("../src/app/api/kundalis/route.ts");
  const dashboard = source("../src/app/KundaliVault.tsx");
  const copy = source("../src/presentation/language.ts");
  assert.match(download, /new Uint8Array\(document\.originalFile\)/);
  assert.match(upload, /originalFile: bytes/);
  assert.match(upload, /processingStatus: "MANUAL_REVIEW_REQUIRED"/);
  assert.doesNotMatch(upload, /openai|anthropic|ocr|extractText/i);
  assert.match(copy, /Automatic PDF text extraction and OCR are not configured/);
  assert.match(copy, /Ask questions only against a saved, verified chart/);
  assert.match(dashboard, /t\("kundali\.noOcr"\)/);
  assert.match(dashboard, /startAutomaticDownload\(saved\)/);
  assert.match(dashboard, /navigator\.share/);
  assert.match(dashboard, /beginBrowserDownload\(objectUrl, record\.downloadName\)/);
  assert.match(dashboard, /t\("kundali\.download"\)/);
});

test("document handling does not create temporary file paths", () => {
  for (const path of [
    "../src/app/api/kundalis/route.ts",
    "../src/app/api/kundalis/[kundaliId]/route.ts",
    "../src/app/api/kundalis/[kundaliId]/original/route.ts",
  ]) {
    const route = source(path);
    assert.doesNotMatch(route, /writeFile|mkdtemp|createWriteStream|tmpdir/);
  }
});
