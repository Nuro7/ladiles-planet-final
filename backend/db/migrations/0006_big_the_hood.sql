ALTER TABLE "bride" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "bride" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bride_image" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "bride_image" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bride_image" ALTER COLUMN "bride_id" SET DATA TYPE integer;