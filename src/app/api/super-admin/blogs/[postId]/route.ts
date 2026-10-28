import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { changeBlogStatus, updateBlogPost } from "@/server/blog-management";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ postId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const authorization = await requireRole(request, ["SUPER_ADMIN"]);
  if (authorization.status !== 200) return jsonError(authorization.status === 401 ? "Sign in is required." : "Super Admin access is required.", authorization.status, authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  try {
    const { postId } = await context.params;
    const post = await getPrisma().blogPost.findUnique({
      where: { id: postId },
      select: {
        id: true, title: true, slug: true, excerpt: true, body: true, featuredImageUrl: true,
        featuredImageAlt: true, authorName: true, category: true, tags: true, status: true,
        seoTitle: true, seoDescription: true, canonicalUrl: true, robotsIndex: true,
        publishedAt: true,
      },
    });
    if (!post) return jsonError("Blog post was not found.", 404, "BLOG_POST_NOT_FOUND");
    return NextResponse.json({ post }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Blog storage is unavailable. The approved Blog CMS migration may not yet be applied.", 503, "BLOG_STORAGE_UNAVAILABLE");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authorization = await requireRole(request, ["SUPER_ADMIN"]);
  if (authorization.status !== 200) return jsonError(authorization.status === 401 ? "Sign in is required." : "Super Admin access is required.", authorization.status, authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const body = await readJson(request);
    if (!body) return jsonError("Blog update details are required.", 422, "INVALID_INPUT");
    const { postId } = await context.params;
    const post = "statusOnly" in body && body.statusOnly === true
      ? await changeBlogStatus(getPrisma(), postId, body.status)
      : await updateBlogPost(getPrisma(), postId, body);
    if (!post) return jsonError("Blog post was not found or its fields are invalid.", 404, "BLOG_POST_NOT_FOUND");
    return NextResponse.json({ post }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return jsonError("That blog slug is already in use.", 409, "SLUG_ALREADY_EXISTS");
    return jsonError("Blog storage is unavailable. The approved Blog CMS migration may not yet be applied.", 503, "BLOG_STORAGE_UNAVAILABLE");
  }
}
