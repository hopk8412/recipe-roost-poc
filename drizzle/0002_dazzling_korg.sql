CREATE TABLE "user_roles" (
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "prep_time";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "cook_time";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "servings";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "difficulty";