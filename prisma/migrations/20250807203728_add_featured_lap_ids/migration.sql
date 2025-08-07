-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "featuredLapIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
