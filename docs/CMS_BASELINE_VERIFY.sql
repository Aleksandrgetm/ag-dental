-- Parameterized READ-ONLY verification query. Bind the exact reviewed
-- backend/internal/cms/content.json as $1 using the PostgreSQL driver.
-- Execute inside REPEATABLE READ READ ONLY, then ROLLBACK. Never interpolate SQL.
-- Run immediately after initial import, BEFORE edits. All discrepancy counts
-- must be zero. Later employee edits legitimately differ from this baseline.
WITH expected AS (
 SELECT key,source_hash,data FROM jsonb_to_recordset(($1::jsonb)->'documents')
 AS d(key text,source_hash text,data jsonb)
), actual AS (
 SELECT d.key,d.source_hash,d.version,d.draft_revision,d.published_revision,r.payload,r.published_at
 FROM public.cms_documents d LEFT JOIN public.cms_revisions r
 ON r.document_key=d.key AND r.id=d.published_revision
), expected_media AS (
 SELECT a->>'id' AS id,a->>'url' AS url,a->>'sha256' AS checksum,
 (a->>'protected')::boolean AS protected,a AS metadata
 FROM jsonb_array_elements(($1::jsonb)->'media') a
), joined_media AS (
 SELECT e.id AS expected_id,a.id AS actual_id,e.url AS expected_url,a.url AS actual_url,
 e.checksum,a.source_hash,e.protected AS expected_protected,a.protected AS actual_protected,
 e.metadata AS expected_metadata,a.metadata AS actual_metadata
 FROM expected_media e FULL JOIN public.cms_media a USING(id)
)
SELECT
 (SELECT count(*) FROM expected) AS expected_groups,
 (SELECT count(*) FROM actual) AS actual_groups,
 (SELECT count(*) FROM expected e FULL JOIN actual a USING(key)
  WHERE e.key IS NULL OR a.key IS NULL OR e.source_hash IS DISTINCT FROM a.source_hash
  OR e.data IS DISTINCT FROM a.payload OR a.version<>1
  OR a.draft_revision IS DISTINCT FROM a.published_revision OR a.published_at IS NULL) AS document_discrepancies,
 (SELECT count(*) FROM joined_media WHERE expected_id IS NULL OR actual_id IS NULL
  OR expected_url IS DISTINCT FROM actual_url OR checksum IS DISTINCT FROM source_hash
  OR expected_protected IS DISTINCT FROM actual_protected
  OR expected_metadata IS DISTINCT FROM actual_metadata) AS media_discrepancies;
