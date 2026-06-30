-- CreateTable
CREATE TABLE "Candle" (
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "openTime" INTEGER NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Candle_pkey" PRIMARY KEY ("symbol","interval","openTime")
);
