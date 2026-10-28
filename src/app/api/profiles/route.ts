import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { validateBirthRecord } from "@/server/birth-validation";
import { getPrisma } from "@/server/db";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { InputError } from "@/calculation/time";
import { ownedRecordData, ownedRecordWhere } from "@/server/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_FIELDS = new Set(["label", "birthPlace", "localDate", "localTime", "timeZone", "latitude", "longitude", "birthTimeAccuracy"]);

function validLabel(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 100;
}

function onlyProfileFields(body: Record<string, unknown>) {
  return Object.keys(body).every((key) => PROFILE_FIELDS.has(key));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const profiles = await getPrisma().birthProfile.findMany({
      where: ownedRecordWhere(user.id),
      orderBy: { updatedAt: "desc" },
      select: { id: true, label: true, birthPlace: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true, birthTimeAccuracy: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ profiles }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Profile storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const body = await readJson(request);
    if (!body || !onlyProfileFields(body) || !validLabel(body.label)) return jsonError("Enter a profile label and valid date of birth.", 422, "INVALID_PROFILE");
    const input = validateBirthRecord(body);
    const profile = await getPrisma().birthProfile.create({
      data: ownedRecordData(user.id, { label: body.label.trim(), ...input }),
      select: { id: true, label: true, birthPlace: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true, birthTimeAccuracy: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ profile }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error instanceof InputError) return jsonError(error.message, 422, error.code);
    return jsonError("Profile storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
