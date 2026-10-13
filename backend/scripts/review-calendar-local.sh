#!/bin/sh
# Creates only a NEW local cluster. Never reads .env/DATABASE_URL or production Storage.
set -eu
cd "$(dirname "$0")/.."
TASK_PORT=${MEDIA_TEST_PORT:-55874}
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
docker exec "$TASK_CONTAINER" createdb -U media_test ag_calendar_test
sed '/^CREATE ROLE /d' testdata/bootstrap.sql | sql ag_calendar_test >/dev/null
for migration in migrations/001_user_roles.sql migrations/002_booking_foundation.sql migrations/003_automatic_confirmation.sql migrations/004_website_cms.sql migrations/005_cms_media.sql migrations/proposed/006_admin_operations.sql; do
 sql ag_calendar_test < "$migration" >/dev/null
done
export MEDIA_UPLOADS_ENABLED=false
export CALENDAR_DATABASE_URL="postgres://media_test@127.0.0.1:$TASK_PORT/ag_calendar_test?sslmode=disable" CALENDAR_BROWSER=disposable
go test -v ./internal/server -run '^TestCalendarBrowser$' -count=1 -timeout=12m
