export function parseTestDatabaseUrl(value) {
  if (!value) {
    throw new Error("LIFE_TEST_DATABASE_URL is required. Copy .env.test.example to .env.test and configure a disposable database.");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("LIFE_TEST_DATABASE_URL is not a valid PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("LIFE_TEST_DATABASE_URL must use PostgreSQL.");
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase())) {
    throw new Error("Refusing database work: PostgreSQL integration tests may target loopback hosts only.");
  }
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!/(?:^|[_-])test$/i.test(databaseName)) {
    throw new Error("Refusing database work: the database name must end in _test or -test.");
  }
  if (/(?:^|[_-])(?:prod|production|stage|staging)(?:[_-]|$)/i.test(databaseName)) {
    throw new Error("Refusing database work: production and staging database names are not allowed.");
  }
  return { url, databaseName };
}

export function assertFreshTestDatabase(userObjectCount) {
  if (userObjectCount === null || userObjectCount === undefined) {
    throw new Error("Refusing migrations: could not verify the test database contains no existing user objects.");
  }
  const count = Number(userObjectCount);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Refusing migrations: could not verify the test database contains no existing user objects.");
  }
  if (count !== 0) {
    throw new Error("Refusing migrations: the test database is not empty. Create a fresh disposable database.");
  }
}
