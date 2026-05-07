ALTER TABLE "director_subtitle_styles"
ADD COLUMN "speakerMode" TEXT NOT NULL DEFAULT 'single',
ADD COLUMN "speakerStyles" JSONB NOT NULL DEFAULT '[]';
