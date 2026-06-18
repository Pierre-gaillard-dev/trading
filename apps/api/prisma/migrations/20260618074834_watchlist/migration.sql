-- CreateTable
CREATE TABLE "WatchedSymbol" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchedSymbol_userId_symbol_key" ON "WatchedSymbol"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "WatchedSymbol" ADD CONSTRAINT "WatchedSymbol_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
