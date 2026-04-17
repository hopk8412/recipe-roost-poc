ALTER TABLE "recipes" ADD COLUMN "rank" varchar(1);--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "rank_check" CHECK ("recipes"."rank" IN ('S', 'A', 'B', 'C', 'D'));