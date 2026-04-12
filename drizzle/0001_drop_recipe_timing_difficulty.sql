-- Migration: remove prep_time, cook_time, servings, difficulty from recipes
-- These fields are no longer part of the recipe model.

ALTER TABLE "recipes"
  DROP COLUMN IF EXISTS "prep_time",
  DROP COLUMN IF EXISTS "cook_time",
  DROP COLUMN IF EXISTS "servings",
  DROP COLUMN IF EXISTS "difficulty";
