ALTER TABLE "latitude"."document_versions" DROP CONSTRAINT "unique_path_commit_id";--> statement-breakpoint
ALTER TABLE "latitude"."document_versions" ADD CONSTRAINT "unique_path_commit_id_deleted_at" UNIQUE("path","commit_id","deleted_at");