import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { createBlogPost, listBlogPosts, BLOG_STATUSES } from "@/server/blog-management";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireRole(request, ["SUPER_ADMIN"]);
  if (authorization.status !== 200) return jsonError(authorization.status === 401 ? "Sign in is required." : "Super Admin access is required.", authorization.status, authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  const params = request.nextUrl.searchParams;
  const rawPage = params.get("page") ?? "1";
  const page = Number(rawPage);
  const query = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "";
  if (!/^[1-9]\d{0,4}$/.test(rawPage) || !Number.isSafeInteger(page) || query.length > 100 || (status && !BLOG_STATUSES.includes(status as typeof BLOG_STATUSES[number]))) {
    return jsonError("Blog filters are invalid.", 400, "INVALID_FILTER");
  }
  try {
    return NextResponse.json(await listBlogPosts(getPrisma(), { page, query, ...(status ? { status: status as typeof BLOG_STATUSES[number] } : {}) }), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Blog storage is unavailable. The approved Blog CMS migration may not yet be applied.", 503, "BLOG_STORAGE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireRole(request, ["SUPER_ADMIN"]);
  if (authorization.status !== 200) return jsonError(authorization.status === 401 ? "Sign in is required." : "Super Admin access is required.", authorization.status, authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const body = await readJson(request);
    if (!body) return jsonError("Blog post details are required.", 422, "INVALID_INPUT");
    const post = await createBlogPost(getPrisma(), body, authorization.user.id);
    if (!post) return jsonError("Blog post fields are invalid.", 422, "INVALID_INPUT");
    return NextResponse.json({ post }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return jsonError("That blog slug is already in use.", 409, "SLUG_ALREADY_EXISTS");
    return jsonError("Blog storage is unavailable. The approved Blog CMS migration may not yet be applied.", 503, "BLOG_STORAGE_UNAVAILABLE");
  }
}
