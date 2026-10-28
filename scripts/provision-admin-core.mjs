export const INTENDED_SUPER_ADMIN_EMAIL = "am123allindiafree@gmail.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBootstrapArguments(args) {
  const values = new Map();
  let confirmed = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--confirm" && !confirmed) {
      confirmed = true;
      continue;
    }
    if (!["--email", "--operator", "--database-name"].includes(argument) || values.has(argument)) {
      throw new Error("Usage: npm run admin:provision -- --email existing@example.com --database-name expected_database --operator name-or-ticket --confirm");
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("Usage: npm run admin:provision -- --email existing@example.com --database-name expected_database --operator name-or-ticket --confirm");
    }
    values.set(argument, value.trim());
    index += 1;
  }
  const email = values.get("--email")?.toLowerCase() ?? "";
  const operator = values.get("--operator") ?? "";
  const databaseName = values.get("--database-name") ?? "";
  if (!confirmed || email !== INTENDED_SUPER_ADMIN_EMAIL || !EMAIL_PATTERN.test(email) || email.length > 254
    || !operator || operator.length > 100 || /[\u0000-\u001f\u007f]/.test(operator)
    || !/^[A-Za-z0-9_-]{1,63}$/.test(databaseName)) {
    throw new Error("Usage: npm run admin:provision -- --email existing@example.com --database-name expected_database --operator name-or-ticket --confirm");
  }
  return { email, operator, databaseName };
}

export async function provisionExistingSuperAdmin(prisma, email, operator) {
  if (typeof email !== "string" || email !== INTENDED_SUPER_ADMIN_EMAIL) {
    throw new Error(`The explicit target must be ${INTENDED_SUPER_ADMIN_EMAIL}.`);
  }
  if (typeof operator !== "string" || !operator.trim() || operator.length > 100 || /[\u0000-\u001f\u007f]/.test(operator)) {
    throw new Error("An explicit operator identity is required.");
  }
  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (!target) throw new Error("The explicitly named account does not exist; no account was changed.");
    const existingSuperAdmins = await transaction.user.count({ where: { role: "SUPER_ADMIN" } });
    if (target.role === "SUPER_ADMIN" && existingSuperAdmins === 1) return "already-provisioned";
    if (target.role === "SUPER_ADMIN") throw new Error("Multiple SUPER_ADMIN accounts exist; refusing an unsafe bootstrap operation.");
    if (existingSuperAdmins !== 0) throw new Error("A SUPER_ADMIN already exists; refusing to promote another account.");

    await transaction.user.update({
      where: { id: target.id },
      data: { role: "SUPER_ADMIN" },
      select: { id: true },
    });
    await transaction.superAdminAccessLog.create({
      data: {
        actorLabel: operator,
        action: "BOOTSTRAP_SUPER_ADMIN",
        page: 0,
        resultCount: 1,
        targetUserId: target.id,
        fromRole: target.role,
        toRole: "SUPER_ADMIN",
      },
      select: { id: true },
    });
    return "provisioned";
  }, { isolationLevel: "Serializable" });
}
