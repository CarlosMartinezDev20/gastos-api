-- Appearance synced across devices: light/dark/system and the accent color.
-- darkMode stays (older app versions read and write it) and mirrors themeMode = DARK.
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

CREATE TYPE "AccentColor" AS ENUM ('LIME', 'MINT', 'SKY', 'VIOLET', 'AMBER');

ALTER TABLE "User" ADD COLUMN "themeMode" "ThemeMode" NOT NULL DEFAULT 'LIGHT',
ADD COLUMN "accent" "AccentColor" NOT NULL DEFAULT 'LIME';

UPDATE "User" SET "themeMode" = 'DARK' WHERE "darkMode";
