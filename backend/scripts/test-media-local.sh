#!/bin/sh
# Creates only a NEW local cluster. Never reads .env/DATABASE_URL or production Storage.
set -eu
cd "$(dirname "$0")/.."
TASK_PORT=${MEDIA_TEST_PORT:-55873}
TASK_ROOT=$(mktemp -d /tmp/ag-media-pg.XXXXXX)
TASK_CONTAINER="ag-media-test-$(basename "$TASK_ROOT" | tr '[:upper:]' '[:lower:]')"
TASK_IMAGE='postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675'
cleanup(){ docker rm -f "$TASK_CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
docker run -d --pull=never --name "$TASK_CONTAINER" --memory=512m --cpus=2 \
 --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=384m \
 -p "127.0.0.1:$TASK_PORT:5432" -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=media_test \
 "$TASK_IMAGE" >/dev/null
for attempt in 1 2 3 4 5 6 7 8 9 10; do
 if docker exec "$TASK_CONTAINER" pg_isready -U media_test >/dev/null 2>&1; then break; fi
 sleep 1
done
sql(){ docker exec -i "$TASK_CONTAINER" psql -X -U media_test -d "$1" -v ON_ERROR_STOP=1; }
printf 'CREATE ROLE anon; CREATE ROLE authenticated;' | sql postgres >/dev/null
for name in media cms booking auth migration; do
 docker exec "$TASK_CONTAINER" createdb -U media_test "ag_${name}_test"
 sed '/^CREATE ROLE /d' testdata/bootstrap.sql | sql "ag_${name}_test" >/dev/null
 if [ "$name" != migration ]; then
  for migration in migrations/001_user_roles.sql migrations/002_booking_foundation.sql migrations/003_automatic_confirmation.sql migrations/004_website_cms.sql migrations/005_cms_media.sql; do
   sql "ag_${name}_test" < "$migration" >/dev/null
  done
 fi
done
# Plain loopback-only local test connections; never a substitute for production verify-full.
export MEDIA_TEST_DATABASE_URL="postgres://media_test@127.0.0.1:$TASK_PORT/ag_media_test?sslmode=disable" MEDIA_TEST_DATABASE_CONFIRM=disposable
export CMS_TEST_DATABASE_URL="postgres://media_test@127.0.0.1:$TASK_PORT/ag_cms_test?sslmode=disable" CMS_TEST_DATABASE_CONFIRM=disposable
export BOOKING_TEST_DATABASE_URL="postgres://media_test@127.0.0.1:$TASK_PORT/ag_booking_test?sslmode=disable" BOOKING_TEST_DATABASE_CONFIRM=disposable
export AUTH_TEST_DATABASE_URL="postgres://media_test@127.0.0.1:$TASK_PORT/ag_auth_test?sslmode=disable" AUTH_TEST_DATABASE_CONFIRM=disposable
export MIGRATION_TEST_DATABASE_URL="postgres://media_test@127.0.0.1:$TASK_PORT/ag_migration_test?sslmode=disable" MIGRATION_TEST_DATABASE_CONFIRM=disposable
docker exec "$TASK_CONTAINER" psql --version
go test -count=1 -p 1 ./...
printf 'Isolated test cluster stopped on exit. Test files: %s\n' "$TASK_ROOT"
