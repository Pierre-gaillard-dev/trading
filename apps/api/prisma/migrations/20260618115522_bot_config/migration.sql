-- CreateTable
CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "strategyKey" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BotConfig" ADD CONSTRAINT "BotConfig_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
