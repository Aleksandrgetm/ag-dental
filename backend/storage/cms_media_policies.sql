-- REVIEW AND APPLY SEPARATELY, ONLY AFTER PRODUCTION APPROVAL.
-- First create private bucket ag-dental-cms with the supported Storage API/dashboard.
-- MIME: image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm; 33554432 bytes.
-- Private originals, derivatives and videos. Public delivery goes through Go's publication gate.
-- Restrictive policies defend this bucket even if unrelated permissive policies exist.
-- service_role bypasses RLS; never expose its key. Do not grant browser access.
BEGIN;
CREATE POLICY ag_cms_no_browser_objects ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
 USING (bucket_id <> 'ag-dental-cms') WITH CHECK (bucket_id <> 'ag-dental-cms');
CREATE POLICY ag_cms_no_browser_bucket_changes ON storage.buckets AS RESTRICTIVE FOR ALL TO anon,authenticated
 USING (id <> 'ag-dental-cms') WITH CHECK (id <> 'ag-dental-cms');
COMMIT;
