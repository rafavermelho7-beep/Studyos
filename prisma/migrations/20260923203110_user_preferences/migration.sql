-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT 'indigo',
ADD COLUMN     "dashboardHidden" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dashboardOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "homePage" TEXT NOT NULL DEFAULT 'dashboard',
ADD COLUMN     "monthlyGoalMinutes" INTEGER,
ADD COLUMN     "themeMode" TEXT NOT NULL DEFAULT 'system';
