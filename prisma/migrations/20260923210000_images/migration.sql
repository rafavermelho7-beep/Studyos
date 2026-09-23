-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "coverImageId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backgroundImageId" TEXT,
ADD COLUMN     "backgroundStyle" TEXT NOT NULL DEFAULT 'plain';

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_userId_idx" ON "Image"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_coverImageId_key" ON "Subject"("coverImageId");

-- CreateIndex
CREATE UNIQUE INDEX "User_backgroundImageId_key" ON "User"("backgroundImageId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_backgroundImageId_fkey" FOREIGN KEY ("backgroundImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

