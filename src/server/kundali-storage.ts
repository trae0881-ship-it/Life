import type { Prisma } from "../../generated/prisma/client";
import { getPrisma } from "./db";

export async function withKundaliDatabaseUser<T>(
  userId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('life.user_id', ${userId}, true)`;
    return operation(transaction);
  });
}
