-- AlterTable
ALTER TABLE "Interview" ADD COLUMN "sourceInterviewId" TEXT;

-- CreateIndex
CREATE INDEX "Interview_sourceInterviewId_idx" ON "Interview"("sourceInterviewId");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_sourceInterviewId_fkey" FOREIGN KEY ("sourceInterviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
