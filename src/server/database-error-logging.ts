export function logDatabaseServiceError(operation: string, error: unknown) {
  const rawCode = typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
  const errorCode = typeof rawCode === "string" && /^[A-Z0-9_]{1,32}$/.test(rawCode)
    ? rawCode
    : undefined;

  console.error("Database service operation failed.", {
    operation,
    errorType: error instanceof Error ? error.name : "UnknownError",
    ...(errorCode ? { errorCode } : {}),
  });
}
