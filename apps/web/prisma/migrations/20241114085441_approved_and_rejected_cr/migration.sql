-- CreateTable
CREATE TABLE "RejectedCr" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,

    CONSTRAINT "RejectedCr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedCr" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,

    CONSTRAINT "ApprovedCr_pkey" PRIMARY KEY ("id")
);
