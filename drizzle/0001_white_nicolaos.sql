CREATE TABLE IF NOT EXISTS "game_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bgg_id" integer NOT NULL,
	"name" text NOT NULL,
	"year_published" integer,
	"bgg_rank" integer,
	"bayes_average" numeric(10, 5),
	"average" numeric(10, 5),
	"users_rated" integer,
	"is_expansion" boolean DEFAULT false NOT NULL,
	"abstracts_rank" integer,
	"cgs_rank" integer,
	"childrensgames_rank" integer,
	"familygames_rank" integer,
	"partygames_rank" integer,
	"strategygames_rank" integer,
	"thematic_rank" integer,
	"wargames_rank" integer,
	"min_players" integer,
	"max_players" integer,
	"playing_time_minutes" integer,
	"description" text,
	"image_url" text,
	"source" text DEFAULT 'csv' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_catalog_bgg_id_unique" UNIQUE("bgg_id")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "catalog_game_id" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_catalog_game_id_game_catalog_id_fk" FOREIGN KEY ("catalog_game_id") REFERENCES "public"."game_catalog"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Existing games are considered published so behaviour stays the same
UPDATE "games" SET "is_published" = true;
