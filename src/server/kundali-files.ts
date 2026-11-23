export const MAX_KUNDALI_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_KUNDALI_REQUEST_BYTES = MAX_KUNDALI_FILE_BYTES + 64 * 1024;

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
} as const;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

export class KundaliFileError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 422) {
    super(message);
    this.name = "KundaliFileError";
    this.code = code;
    this.status = status;
  }
}

function isPng(bytes: Uint8Array) {
  if (bytes.length < 8 || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) return false;
  let offset = 8;
  let sawHeader = false;
  let sawData = false;
  let sawEnd = false;
  let width = 0;
  let height = 0;

  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const crcOffset = dataOffset + length;
    if (length > bytes.length - offset - 12) return false;
    const type = String.fromCharCode(...bytes.subarray(typeOffset, typeOffset + 4));
    if (!/^[A-Za-z]{4}$/.test(type)) return false;
    if (!sawHeader && type !== "IHDR") return false;
    if (type === "IHDR") {
      if (sawHeader || length !== 13) return false;
      width = new DataView(bytes.buffer, bytes.byteOffset + dataOffset, 4).getUint32(0);
      height = new DataView(bytes.buffer, bytes.byteOffset + dataOffset + 4, 4).getUint32(0);
      if (!width || !height || width > 8192 || height > 8192 || width * height > 40_000_000) return false;
      sawHeader = true;
    } else if (type === "IDAT") {
      sawData = true;
    } else if (type === "IEND") {
      if (length !== 0 || !sawData || crcOffset + 4 !== bytes.length) return false;
      sawEnd = true;
    } else if (type === "PLTE") {
      if (sawData) return false;
    } else if (type.charCodeAt(0) >= 65 && type.charCodeAt(0) <= 90) {
      return false;
    }

    if (crc32(bytes, typeOffset, crcOffset) !== new DataView(bytes.buffer, bytes.byteOffset + crcOffset, 4).getUint32(0)) return false;
    offset = crcOffset + 4;
    if (sawEnd) return offset === bytes.length;
  }
  return false;
}

function crc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc = PNG_CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isJpeg(bytes: Uint8Array) {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;
  let segments = 0;

  while (offset < bytes.length && segments < 10_000) {
    const markerStart = offset;
    if (bytes[offset] !== 0xff) return false;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return false;
    const marker = bytes[offset++];
    if (marker === 0xd9) return sawFrame && sawScan && offset === bytes.length;
    if (marker === 0xd8 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) return false;
    if (marker === 0x01) continue;
    if (offset + 2 > bytes.length) return false;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || segmentLength > bytes.length - offset) return false;
    const segmentData = offset + 2;
    const segmentEnd = offset + segmentLength;

    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (segmentLength < 11) return false;
      const height = (bytes[segmentData + 1] << 8) | bytes[segmentData + 2];
      const width = (bytes[segmentData + 3] << 8) | bytes[segmentData + 4];
      const components = bytes[segmentData + 5];
      if (!width || !height || width * height > 40_000_000 || segmentLength !== 8 + 3 * components) return false;
      sawFrame = true;
    }

    offset = segmentEnd;
    segments += 1;
    if (marker !== 0xda) continue;
    if (!sawFrame) return false;
    sawScan = true;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const nextMarkerStart = offset;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) return false;
      const nextMarker = bytes[offset];
      if (nextMarker === 0x00 || (nextMarker >= 0xd0 && nextMarker <= 0xd7)) {
        offset += 1;
        continue;
      }
      if (nextMarker === 0xd9) {
        offset += 1;
        return offset === bytes.length;
      }
      offset = nextMarkerStart;
      break;
    }
    if (offset === segmentEnd) return false;
  }
  return false;
}

function validatePdf(bytes: Uint8Array) {
  if (bytes.length < 16) return false;
  const header = new TextDecoder("ascii").decode(bytes.subarray(0, 8));
  const tail = new TextDecoder("ascii").decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
  if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(header) || !/%%EOF\s*$/.test(tail)) return false;
  const content = new TextDecoder("latin1").decode(bytes);
  return !/\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA|XFA)(?=[\s/<>()\[\]]|$)/i.test(content);
}

export function validateKundaliUpload(fileName: string, mimeType: string, bytes: Uint8Array) {
  if (bytes.byteLength > MAX_KUNDALI_FILE_BYTES) {
    throw new KundaliFileError("Choose a file smaller than 10 MB.", "FILE_TOO_LARGE", 413);
  }
  if (bytes.byteLength < 16) throw new KundaliFileError("The file is empty or incomplete.", "FILE_CORRUPT");
  if (fileName.length > 180 || /[\\/\u0000-\u001f\u007f]/.test(fileName)) {
    throw new KundaliFileError("Use a regular PDF or image filename.", "INVALID_FILENAME");
  }
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (!Object.hasOwn(MIME_BY_EXTENSION, extension)) {
    throw new KundaliFileError("Upload a PDF, JPG, JPEG, or PNG Kundali.", "UNSUPPORTED_FILE_TYPE");
  }
  const contentType = MIME_BY_EXTENSION[extension as keyof typeof MIME_BY_EXTENSION];
  if (mimeType.toLowerCase() !== contentType) {
    throw new KundaliFileError("The file type does not match its contents.", "MIME_TYPE_MISMATCH");
  }

  const signatureValid = extension === "pdf"
    ? validatePdf(bytes)
    : extension === "png"
      ? isPng(bytes)
      : isJpeg(bytes);
  if (!signatureValid) throw new KundaliFileError("This file is corrupted, unsupported, or has an invalid signature.", "INVALID_FILE_SIGNATURE");
  return { contentType, extension };
}

export function kundaliDownloadName(id: string, uploadedAt: Date, extension: string) {
  if (!isValidKundaliId(id) || !["pdf", "jpg", "jpeg", "png"].includes(extension)) {
    throw new Error("Stored Kundali download metadata is invalid.");
  }
  const date = uploadedAt.toISOString().slice(0, 10);
  return `LIFE-Kundali-Original-${date}-${id.slice(0, 8)}.${extension}`;
}

export function isValidKundaliId(value: string) {
  return /^[A-Za-z0-9_-]{32}$/.test(value);
}
