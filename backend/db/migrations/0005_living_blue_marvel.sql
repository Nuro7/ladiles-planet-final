CREATE TABLE "bride" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bride_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bride_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"image_type" text NOT NULL,
	"angle" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bride_image" ADD CONSTRAINT "bride_image_bride_id_bride_id_fk" FOREIGN KEY ("bride_id") REFERENCES "public"."bride"("id") ON DELETE cascade ON UPDATE no action;