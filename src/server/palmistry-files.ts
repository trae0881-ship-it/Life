import { KundaliFileError, MAX_KUNDALI_FILE_BYTES, MAX_KUNDALI_REQUEST_BYTES, validateKundaliUpload } from "./kundali-files.ts";

export const MAX_PALMISTRY_FILE_BYTES = MAX_KUNDALI_FILE_BYTES;
export const MAX_PALMISTRY_REQUEST_BYTES = MAX_KUNDALI_REQUEST_BYTES;

export function validatePalmistryUpload(fileName: string, mimeType: string, bytes: Uint8Array) {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension !== "jpg" && extension !== "jpeg" && extension !== "png") {
    throw new KundaliFileError("Choose a JPG, JPEG, or PNG hand image.", "UNSUPPORTED_FILE_TYPE");
  }
  return validateKundaliUpload(fileName, mimeType, bytes);
}

export function palmistryDownloadName(id: string, uploadedAt: Date, extension: string) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id) || !["jpg", "jpeg", "png"].includes(extension)) {
    throw new Error("Stored Palmistry image metadata is invalid.");
  }
  return `LIFE-Palmistry-Original-${uploadedAt.toISOString().slice(0, 10)}-${id.slice(0, 8)}.${extension}`;
}
