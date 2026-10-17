CREATE TABLE "dresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"is_available" boolean DEFAULT true,
	"is_archived" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"archived_at" timestamp with time zone,
	CONSTRAINT "dresses_sku_unique" UNIQUE("sku")
);
