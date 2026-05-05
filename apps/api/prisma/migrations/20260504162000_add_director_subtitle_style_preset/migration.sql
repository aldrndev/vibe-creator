ALTER TABLE "director_subtitle_styles"
ADD COLUMN "stylePreset" TEXT NOT NULL DEFAULT 'custom';

UPDATE "director_subtitle_styles"
SET "stylePreset" = 'viral-pop'
WHERE "position" = 'center'
  AND "bgColorToken" = 'BG_TRANSPARENT'
  AND "textColorToken" IN ('C_YELLOW', 'C_ORANGE')
  AND "animation" IN ('typewriter', 'word', 'pop-word');
