import { KundaliFileError, MAX_KUNDALI_FILE_BYTES, MAX_KUNDALI_REQUEST_BYTES, validateKundaliUpload } from "./kundali-files.ts";

export const MAX_PALMISTRY_FILE_BYTES = MAX_KUNDALI_FILE_BYTES;
export const MAX_PALMISTRY_REQUEST_BYTES = MAX_KUNDALI_REQUEST_BYTES;

function readUint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function isWebp(bytes: Uint8Array) {
  const text = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (bytes.length < 30 || text(0, 4) !== "RIFF" || text(8, 4) !== "WEBP") return false;
  if (new DataView(bytes.buffer, bytes.byteOffset + 4, 4).getUint32(0, true) + 8 !== bytes.length) return false;
  let offset = 12;
  let dimensions: { width: number; height: number } | null = null;
  let sawImageData = false;
  while (offset + 8 <= bytes.length) {
    const type = text(offset, 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const dataOffset = offset + 8;
    if (length > bytes.length - dataOffset) return false;
    if (type === "VP8X") {
      if (length < 10) return false;
      if ((bytes[dataOffset] & 0x02) !== 0) return false;
      dimensions = {
        width: readUint24LE(bytes, dataOffset + 4) + 1,
        height: readUint24LE(bytes, dataOffset + 7) + 1,
      };
    } else if (type === "VP8L") {
      if (length < 5 || bytes[dataOffset] !== 0x2f) return false;
      const b1 = bytes[dataOffset + 1];
      const b2 = bytes[dataOffset + 2];
      const b3 = bytes[dataOffset + 3];
      const b4 = bytes[dataOffset + 4];
      dimensions = {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      };
      sawImageData = true;
    } else if (type === "VP8 ") {
      if (length < 10 || bytes[dataOffset + 3] !== 0x9d || bytes[dataOffset + 4] !== 0x01 || bytes[dataOffset + 5] !== 0x2a) return false;
      dimensions = {
        width: ((bytes[dataOffset + 7] & 0x3f) << 8) | bytes[dataOffset + 6],
        height: ((bytes[dataOffset + 9] & 0x3f) << 8) | bytes[dataOffset + 8],
      };
      sawImageData = true;
    }
    offset = dataOffset + length + (length % 2);
  }
  if (offset !== bytes.length || !sawImageData || !dimensions) return false;
  return dimensions.width > 0 && dimensions.height > 0
    && dimensions.width <= 8192 && dimensions.height <= 8192
    && dimensions.width * dimensions.height <= 40_000_000;
}

export function validatePalmistryUpload(fileName: string, mimeType: string, bytes: Uint8Array) {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension !== "webp") {
    if (extension !== "jpg" && extension !== "jpeg" && extension !== "png") {
      throw new KundaliFileError("Choose a JPG, JPEG, PNG, or WEBP hand image.", "UNSUPPORTED_FILE_TYPE");
    }
    return validateKundaliUpload(fileName, mimeType, bytes);
  }
  if (bytes.byteLength > MAX_PALMISTRY_FILE_BYTES) {
    throw new KundaliFileError("Choose an image smaller than 10 MB.", "FILE_TOO_LARGE", 413);
  }
  if (bytes.byteLength < 30) throw new KundaliFileError("The image is empty or incomplete.", "FILE_CORRUPT");
  if (fileName.length > 180 || /[\\/\u0000-\u001f\u007f]/.test(fileName)) {
    throw new KundaliFileError("Use a regular image filename.", "INVALID_FILENAME");
  }
  if (mimeType.toLowerCase() !== "image/webp") {
    throw new KundaliFileError("The file type does not match its contents.", "MIME_TYPE_MISMATCH");
  }
  if (!isWebp(bytes)) {
    throw new KundaliFileError("This image is corrupted or has an invalid WEBP structure.", "INVALID_FILE_SIGNATURE");
  }
  return { contentType: "image/webp", extension };
}

export function palmistryDownloadName(
  id: string,
  uploadedAt: Date,
  extension: string,
  hand?: "left" | "right" | "unassigned",
) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id) || !["jpg", "jpeg", "png", "webp"].includes(extension)) {
    throw new Error("Stored Palmistry image metadata is invalid.");
  }
  const handLabel = hand ? `-${hand[0].toUpperCase()}${hand.slice(1)}` : "";
  return `LIFE-Palmistry${handLabel}-Original-${uploadedAt.toISOString().slice(0, 10)}-${id.slice(0, 8)}.${extension}`;
}
