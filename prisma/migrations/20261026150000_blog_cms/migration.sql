CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "excerpt" VARCHAR(320) NOT NULL,
    "body" TEXT NOT NULL,
    "featuredImageUrl" VARCHAR(2048),
    "featuredImageAlt" TEXT,
    "authorName" VARCHAR(100) NOT NULL,
    "category" VARCHAR(80),
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" VARCHAR(70),
    "seoDescription" VARCHAR(160),
    "canonicalUrl" VARCHAR(2048),
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");
CREATE INDEX "BlogPost_category_status_publishedAt_idx" ON "BlogPost"("category", "status", "publishedAt");
CREATE INDEX "BlogPost_updatedAt_idx" ON "BlogPost"("updatedAt");

ALTER TABLE "BlogPost"
ADD CONSTRAINT "BlogPost_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
