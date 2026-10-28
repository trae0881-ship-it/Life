ALTER TYPE "SuperAdminAccessAction" ADD VALUE 'USER_ROLE_CHANGED';
ALTER TYPE "SuperAdminAccessAction" ADD VALUE 'BOOTSTRAP_SUPER_ADMIN';

ALTER TABLE "SuperAdminAccessLog"
  ALTER COLUMN "actorUserId" DROP NOT NULL,
  ADD COLUMN "actorLabel" TEXT,
  ADD COLUMN "targetUserId" TEXT,
  ADD COLUMN "fromRole" "UserRole",
  ADD COLUMN "toRole" "UserRole";
