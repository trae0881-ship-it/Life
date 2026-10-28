import { createHash } from "node:crypto";
import { Script } from "node:vm";
import type { UserRole } from "./auth-core.ts";
import { isSameOriginMutation } from "./same-origin.ts";
import { readJson, RequestBodyError } from "./request-body.ts";

export const MANAGED_SCRIPT_PLACEMENTS = ["HEAD", "BODY_START", "BODY_END"] as const;
export const MAX_MANAGED_SCRIPT_BYTES = 16_000;
const MAX_TARGET_PATHS = 30;

export type ManagedScriptPlacement = (typeof MANAGED_SCRIPT_PLACEMENTS)[number];
export type ManagedScriptAuditAction = "CREATED" | "UPDATED" | "ENABLED" | "DISABLED" | "DELETED";
export type ManagedScriptRecord = {
  id: string;
  name: string;
  snippet: string;
  placement: ManagedScriptPlacement;
  enabled: boolean;
  targetPaths: string[];
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type Authorization = {
  status: 200 | 401 | 403;
  user: { id: string; role?: UserRole } | null;
};

type ManagedScriptsTransaction = {
  managedScript: {
    findUnique(args: { where: { id: string } }): Promise<ManagedScriptRecord | null>;
    create(args: { data: Omit<ManagedScriptRecord, "id" | "createdAt" | "updatedAt"> }): Promise<ManagedScriptRecord>;
    update(args: { where: { id: string }; data: Partial<Pick<ManagedScriptRecord, "name" | "snippet" | "placement" | "enabled" | "targetPaths">> & { updatedByUserId: string } }): Promise<ManagedScriptRecord>;
    delete(args: { where: { id: string } }): Promise<ManagedScriptRecord>;
  };
  managedScriptAuditLog: {
    create(args: { data: { scriptId: string; scriptName: string; actorUserId: string; action: ManagedScriptAuditAction } }): Promise<unknown>;
  };
};

export type ManagedScriptAuditEvent = {
  id: string;
  scriptId: string;
  scriptName: string;
  actorUserId: string;
  action: ManagedScriptAuditAction;
  createdAt: Date;
};

export type ManagedScriptsRepository = ManagedScriptsTransaction & {
  managedScript: ManagedScriptsTransaction["managedScript"] & {
    findMany(args: { where?: { enabled?: boolean }; orderBy?: { createdAt: "asc" | "desc" } }): Promise<ManagedScriptRecord[]>;
  };
  managedScriptAuditLog: ManagedScriptsTransaction["managedScriptAuditLog"] & {
    findMany(args: { orderBy: { createdAt: "desc" }; take: number }): Promise<ManagedScriptAuditEvent[]>;
  };
  $transaction<T>(callback: (transaction: ManagedScriptsTransaction) => Promise<T>): Promise<T>;
};

type Dependencies = {
  authorize(request: Request, allowed: readonly UserRole[]): Promise<Authorization>;
  repository(): ManagedScriptsRepository;
};

function errorResponse(error: string, code: string, status: number) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

function authorizedResponse(auth: Authorization) {
  if (auth.status === 200 && auth.user) return null;
  const status = auth.status === 401 ? 401 : 403;
  return errorResponse(status === 401 ? "Sign in is required." : "Administrator access is required.", status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", status);
}

export function isValidManagedScriptTargetPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 300 || !value.startsWith("/")
    || value.startsWith("//") || /[\s?#\\\u0000-\u001f]/.test(value)) return false;
  try {
    const decoded = decodeURIComponent(value);
    return !decoded.split("/").some((part) => part === "." || part === "..")
      && !decoded.includes("?") && !decoded.includes("#") && !decoded.includes("\\");
  } catch {
    return false;
  }
}

function validateTargetPaths(value: unknown): string[] | undefined {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_TARGET_PATHS
    || !value.every(isValidManagedScriptTargetPath)
    || new Set(value).size !== value.length) return undefined;
  return value;
}

function validateSnippet(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || Buffer.byteLength(value, "utf8") > MAX_MANAGED_SCRIPT_BYTES) return false;
  try {
    new Script(value);
    return true;
  } catch {
    return false;
  }
}

type ManagedScriptInput = {
  name: string;
  snippet: string;
  placement: ManagedScriptPlacement;
  enabled: boolean;
  targetPaths: string[];
};

function validateFullInput(value: Record<string, unknown>): ManagedScriptInput | null {
  if (typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 100
    || !validateSnippet(value.snippet)
    || !MANAGED_SCRIPT_PLACEMENTS.includes(value.placement as ManagedScriptPlacement)
    || typeof value.enabled !== "boolean") return null;
  const targetPaths = validateTargetPaths(value.targetPaths);
  if (targetPaths === undefined) return null;
  return {
    name: value.name.trim(),
    snippet: value.snippet,
    placement: value.placement as ManagedScriptPlacement,
    enabled: value.enabled,
    targetPaths,
  };
}

function recordAudit(transaction: ManagedScriptsTransaction, script: Pick<ManagedScriptRecord, "id" | "name">, actorUserId: string, action: ManagedScriptAuditAction) {
  return transaction.managedScriptAuditLog.create({
    data: { scriptId: script.id, scriptName: script.name, actorUserId, action },
  });
}

export async function handleManagedScriptsCollection(request: Request, dependencies: Dependencies) {
  const authorization = await dependencies.authorize(request, ["ADMIN", "SUPER_ADMIN"]);
  const denied = authorizedResponse(authorization);
  if (denied) return denied;

  if (request.method === "GET") {
    try {
      const repository = dependencies.repository();
      const [scripts, auditEvents] = await Promise.all([
        repository.managedScript.findMany({ orderBy: { createdAt: "desc" } }),
        repository.managedScriptAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      ]);
      return Response.json({ scripts, auditEvents }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return errorResponse("Script storage is unavailable. The admin script manager migration may not be applied.", "SCRIPT_STORAGE_UNAVAILABLE", 503);
    }
  }
  if (request.method !== "POST") return errorResponse("Method not allowed.", "METHOD_NOT_ALLOWED", 405);
  if (!isSameOriginMutation(request)) return errorResponse("Request origin is not allowed.", "INVALID_ORIGIN", 403);

  try {
    const body = await readJson(request, MAX_MANAGED_SCRIPT_BYTES + 8_000);
    const input = body && validateFullInput(body);
    if (!input) return errorResponse("Script name, valid JavaScript, placement, enabled state and page targeting are required.", "INVALID_SCRIPT", 422);
    const repository = dependencies.repository();
    const script = await repository.$transaction(async (transaction) => {
      const created = await transaction.managedScript.create({
        data: { ...input, createdByUserId: authorization.user!.id, updatedByUserId: authorization.user!.id },
      });
      await recordAudit(transaction, created, authorization.user!.id, "CREATED");
      if (created.enabled) await recordAudit(transaction, created, authorization.user!.id, "ENABLED");
      return created;
    });
    return Response.json({ script }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return errorResponse(error.message, error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON", error.status);
    return errorResponse("Script storage is unavailable. The admin script manager migration may not be applied.", "SCRIPT_STORAGE_UNAVAILABLE", 503);
  }
}

export async function handleManagedScript(request: Request, scriptId: string, dependencies: Dependencies) {
  const authorization = await dependencies.authorize(request, ["ADMIN", "SUPER_ADMIN"]);
  const denied = authorizedResponse(authorization);
  if (denied) return denied;
  if (!scriptId || scriptId.length > 64) return errorResponse("Script identifier is invalid.", "INVALID_SCRIPT_ID", 422);

  const repository = dependencies.repository();
  if (request.method === "GET") {
    try {
      const script = await repository.managedScript.findUnique({ where: { id: scriptId } });
      return script
        ? Response.json({ script }, { headers: { "Cache-Control": "no-store" } })
        : errorResponse("Script was not found.", "SCRIPT_NOT_FOUND", 404);
    } catch {
      return errorResponse("Script storage is unavailable. The admin script manager migration may not be applied.", "SCRIPT_STORAGE_UNAVAILABLE", 503);
    }
  }

  if (request.method !== "PATCH" && request.method !== "DELETE") return errorResponse("Method not allowed.", "METHOD_NOT_ALLOWED", 405);
  if (!isSameOriginMutation(request)) return errorResponse("Request origin is not allowed.", "INVALID_ORIGIN", 403);

  try {
    if (request.method === "DELETE") {
      const result = await repository.$transaction(async (transaction) => {
        const existing = await transaction.managedScript.findUnique({ where: { id: scriptId } });
        if (!existing) return null;
        const deleted = await transaction.managedScript.delete({ where: { id: scriptId } });
        await recordAudit(transaction, deleted, authorization.user!.id, "DELETED");
        return deleted;
      });
      return result
        ? Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } })
        : errorResponse("Script was not found.", "SCRIPT_NOT_FOUND", 404);
    }

    const body = await readJson(request, MAX_MANAGED_SCRIPT_BYTES + 8_000);
    if (!body || Object.keys(body).some((key) => !["name", "snippet", "placement", "enabled", "targetPaths"].includes(key))
      || Object.keys(body).length === 0) return errorResponse("Script update fields are invalid.", "INVALID_SCRIPT", 422);

    const updated = await repository.$transaction(async (transaction) => {
      const existing = await transaction.managedScript.findUnique({ where: { id: scriptId } });
      if (!existing) return null;
      const merged = validateFullInput({
        name: body.name ?? existing.name,
        snippet: body.snippet ?? existing.snippet,
        placement: body.placement ?? existing.placement,
        enabled: body.enabled ?? existing.enabled,
        targetPaths: body.targetPaths === undefined ? existing.targetPaths : body.targetPaths,
      });
      if (!merged) return "invalid" as const;
      const script = await transaction.managedScript.update({
        where: { id: scriptId },
        data: { ...merged, updatedByUserId: authorization.user!.id },
      });
      const action = existing.enabled !== script.enabled
        ? script.enabled ? "ENABLED" : "DISABLED"
        : "UPDATED";
      await recordAudit(transaction, script, authorization.user!.id, action);
      return script;
    });
    if (!updated) return errorResponse("Script was not found.", "SCRIPT_NOT_FOUND", 404);
    if (updated === "invalid") return errorResponse("Script update fields are invalid.", "INVALID_SCRIPT", 422);
    return Response.json({ script: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return errorResponse(error.message, error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON", error.status);
    return errorResponse("Script storage is unavailable. The admin script manager migration may not be applied.", "SCRIPT_STORAGE_UNAVAILABLE", 503);
  }
}

export type RuntimeScript = { id: string; placement: ManagedScriptPlacement; snippet: string; targetPaths: string[]; enabled: boolean };

export function runtimeScriptsForPath(scripts: readonly RuntimeScript[], path: string) {
  const seenSnippets = new Set<string>();
  const result: Pick<RuntimeScript, "id" | "placement" | "snippet">[] = [];
  for (const script of scripts) {
    if (!script.enabled || (script.targetPaths.length > 0 && !script.targetPaths.includes(path))) continue;
    const digest = createHash("sha256").update(script.snippet).digest("hex");
    if (seenSnippets.has(digest)) continue;
    seenSnippets.add(digest);
    result.push({ id: script.id, placement: script.placement, snippet: script.snippet });
  }
  return result;
}

export async function handlePublicRuntimeScripts(request: Request, repository: Pick<ManagedScriptsRepository, "managedScript">) {
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some((key) => key !== "path") || url.searchParams.getAll("path").length !== 1) {
    return errorResponse("A single page path is required.", "INVALID_PAGE_PATH", 422);
  }
  const path = url.searchParams.get("path");
  if (!isValidManagedScriptTargetPath(path)) return errorResponse("Page path is invalid.", "INVALID_PAGE_PATH", 422);
  try {
    const scripts = await repository.managedScript.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ scripts: runtimeScriptsForPath(scripts, path) }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return errorResponse("Runtime scripts are unavailable. The admin script manager migration may not be applied.", "SCRIPT_STORAGE_UNAVAILABLE", 503);
  }
}
