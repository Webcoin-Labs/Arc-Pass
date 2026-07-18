/**
 * node-postgres currently treats sslmode=require as certificate-verifying,
 * but its next major version will adopt libpq's weaker semantics. Preserve the
 * verified Neon behaviour explicitly and avoid a silent security regression.
 */
export function normalizePostgresConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.searchParams.get("sslmode") === "require") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Let node-postgres return its normal, redacted connection error.
  }
  return connectionString;
}
