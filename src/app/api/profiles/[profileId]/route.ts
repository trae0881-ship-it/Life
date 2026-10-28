import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { validateBirthRecord } from "@/server/birth-validation";
import { getPrisma } from "@/server/db";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { InputError } from "@/calculation/time";
import { ownedRecordWhere } from "@/server/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ profileId: string }> };
const PROFILE_FIELDS = new Set(["label", "birthPlace", "localDate", "localTime", "timeZone", "latitude", "longitude", "birthTimeAccuracy"]);

function onlyProfileFields(body: Record<string, unknown>) {
  return Object.keys(body).every((key) => PROFILE_FIELDS.has(key));
}

function validLabel(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 100;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { profileId } = await context.params;
    const profile = await getPrisma().birthProfile.findFirst({
      where: ownedRecordWhere(user.id, profileId),
      select: { id: true, label: true, birthPlace: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true, birthTimeAccuracy: true, createdAt: true, updatedAt: true },
    });
    if (!profile) return jsonError("Profile not found.", 404, "NOT_FOUND");
    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Profile storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { profileId } = await context.params;
    const body = await readJson(request);
    if (!body || !Object.keys(body).length || !onlyProfileFields(body)) return jsonError("Profile update fields are invalid.", 422, "INVALID_PROFILE");
    const prisma = getPrisma();
    const existing = await prisma.birthProfile.findFirst({ where: ownedRecordWhere(user.id, profileId) });
    if (!existing) return jsonError("Profile not found.", 404, "NOT_FOUND");
    const values = { ...existing, ...body };
    if (!validLabel(values.label)) return jsonError("Enter a profile label up to 100 characters.", 422, "INVALID_PROFILE");
    const input = validateBirthRecord(values);
    const data = {
      ...(body.label !== undefined ? { label: values.label.trim() } : {}),
      ...(body.birthPlace !== undefined ? { birthPlace: input.birthPlace } : {}),
      ...(body.localDate !== undefined ? { localDate: input.localDate } : {}),
      ...(body.localTime !== undefined ? { localTime: input.localTime } : {}),
      ...(body.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
      ...(body.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(body.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(body.birthTimeAccuracy !== undefined ? { birthTimeAccuracy: input.birthTimeAccuracy } : {}),
    };
    const updated = await prisma.birthProfile.updateMany({
      where: ownedRecordWhere(user.id, profileId),
      data,
    });
    if (!updated.count) return jsonError("Profile not found.", 404, "NOT_FOUND");
    const profile = await prisma.birthProfile.findFirst({
      where: ownedRecordWhere(user.id, profileId),
      select: { id: true, label: true, birthPlace: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true, birthTimeAccuracy: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error instanceof InputError) return jsonError(error.message, 422, error.code);
    return jsonError("Profile storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { profileId } = await context.params;
    const result = await getPrisma().birthProfile.deleteMany({ where: ownedRecordWhere(user.id, profileId) });
    if (!result.count) return jsonError("Profile not found.", 404, "NOT_FOUND");
    return NextResponse.json({ deleted: true });
  } catch {
    return jsonError("Profile storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
