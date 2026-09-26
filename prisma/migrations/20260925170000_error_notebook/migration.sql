-- CreateTable
CREATE TABLE "ErrorEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT,
    "topicId" TEXT,
    "source" TEXT,
    "question" TEXT,
    "imageId" TEXT,
    "reason" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorEntry_imageId_key" ON "ErrorEntry"("imageId");

-- CreateIndex
CREATE INDEX "ErrorEntry_userId_nextReviewAt_idx" ON "ErrorEntry"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "ErrorEntry_topicId_idx" ON "ErrorEntry"("topicId");

-- CreateIndex
CREATE INDEX "ErrorEntry_subjectId_idx" ON "ErrorEntry"("subjectId");

-- AddForeignKey
ALTER TABLE "ErrorEntry" ADD CONSTRAINT "ErrorEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorEntry" ADD CONSTRAINT "ErrorEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorEntry" ADD CONSTRAINT "ErrorEntry_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorEntry" ADD CONSTRAINT "ErrorEntry_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

