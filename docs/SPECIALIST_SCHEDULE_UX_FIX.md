# Specialist schedule UX and validation fix

Branch: `feature/final-development`. Local implementation and synthetic testing only.

## Root causes and evidence

The generic Russian message was a shared fallback, not a diagnosis. No production patient's or doctor's failing request was captured, so it is not possible to attribute that particular historical click to one cause. Investigation found and fixed these concrete problems:

1. **Real API contract mismatch.** `/api/admin/operations/doctors/options` serialized the public `Service` model. Its `active` and `booking_enabled` fields intentionally have `json:"-"`. The specialist UI filters services and calculates readiness using those fields. The real database browser test reproduced missing approved choices even though active, booking-enabled services existed. Prior mocked fixtures supplied the flags, concealing this bug. The verified-admin response now explicitly includes them; public serialization remains unchanged.
2. **Generic time errors.** Frontend validation only checked a broad time pattern/order and set `invalid`; backend interval/profile errors also became `invalid_request`, and the shared request client discarded useful context. Blank, reversed, overlapping or invalid effective-date intervals now produce localized errors next to the relevant day. Server validation returns only allowlisted codes/day numbers, never submitted content or SQL errors.
3. **Valid final schedules could be rejected during replacement.** Sequential updates evaluated a changed interval against still-active old adjacent intervals and checked appointment coverage during intermediate deletion. For example changing 09:00–12:00 / 13:00–17:00 to 09:00–14:00 / 14:00–17:00 can collide temporarily despite a valid final schedule. The transaction validates the complete set and ownership, replaces the active set, then checks final appointment coverage against the original set. Database exclusion constraints, configuration locking, transaction rollback and audit remain in force. A real PostgreSQL regression verifies this case.
4. **Unsaved-profile dead end.** Services/Schedule were disabled with instructions but no continuation action. Save doctor and continue now validates/saves Profile, preserves entries and returns to the requested tab. It never redirects to the doctor list or implicitly enables booking.
5. **Full-day absence ambiguity.** Date-time inputs exposed midnight/exclusive-end details. Full-day absences now use first/last inclusive dates; the request still uses the existing Riga-aware exclusive-end contract. Invalid/repeated/nonexistent local times remain rejected. New breaks must fall within saved working hours.

Missing services are not required merely to save an inactive doctor's schedule. They are required for booking readiness. Existing CMS linking still requires explicit confirmation; missing/invalid profile text is reported in Profile. Legal approval dialogs remain, and activation is always explicit.

## Workflow and layout

- Compact Monday–Sunday rows, explicit Working / Day off labels, time inputs only on enabled days.
- No default working hours. Existing saved intervals, identities and effective dates are retained. Multiple intervals remain supported under secondary controls.
- Copy Monday's hours opens a selected-day checklist. The user confirms replacement of only those days; it does not save automatically.
- One **Save schedule** action, disabled while saving; clear success only after backend acceptance.
- Reversed/overlapping times are shown beside the affected day. Existing-appointment impact is explained and changed days are marked. Stale edits and API failures retain entered values.
- Breaks/vacations/blocked dates and optional availability preview remain collapsed. No new navigation section.
- Readiness shows the next missing requirement or readiness to enable. Activation requires the unchanged server-side checks and clinic confirmation.
- LV/RU/EN, keyboard focus, unsaved-change warnings, tab preservation and all eight requested viewport widths retained.

## Screenshots

Before captures are preserved synthetic screenshots from the preceding specialist-editor review. After captures use the real Go handlers and a disposable PostgreSQL database.

| Viewport | Before | After |
| --- | --- | --- |
| 390px | [Before](screenshots/specialist-schedule/before-390.png) | [After](screenshots/specialist-schedule/after-390.png) |
| 1440px | [Before](screenshots/specialist-schedule/before-1440.png) | [After](screenshots/specialist-schedule/after-1440.png) |

## Exact files changed in this task

Backend:
- `backend/internal/booking/doctor_setup.go`
- `backend/internal/booking/profiles.go`
- `backend/internal/booking/operations.go`
- `backend/internal/booking/validation_detail.go`
- `backend/internal/booking/validation_detail_test.go`
- `backend/internal/booking/schedule_replacement_test.go`
- `backend/internal/server/calendar_browser_test.go` — opt-in selector for the schedule browser suite.

Frontend:
- `frontend/src/views/admin/AdminDoctorSetup.vue`
- `frontend/src/views/admin/AdminSchedulesView.vue`
- `frontend/src/services/admin/operations.ts`
- `frontend/src/services/admin/scheduleValidation.ts`
- `frontend/src/i18n/specialistEditor.ts`
- `frontend/tests/schedule-validation.test.mjs`
- `frontend/tests/schedule-realistic-browser.cjs`
- `frontend/tests/specialist-editor-browser.cjs`
- `frontend/tests/admin-simple-workflows-browser.cjs`
- `frontend/tests/specialist-time-off-browser.cjs`

Documentation/evidence:
- `docs/SPECIALIST_SCHEDULE_UX_FIX.md`
- Four images in `docs/screenshots/specialist-schedule/` linked above.
- Existing specialist regression also refreshes its six synthetic profile/services/schedule captures in `docs/screenshots/specialist-editor/`.

## Test isolation and reproduction

The existing guarded `backend/scripts/review-calendar-local.sh` creates a new loopback PostgreSQL test database, applies migrations locally, starts a test-only Go router, then deletes the container. Set `SCHEDULE_BROWSER=disposable` to select the new suite. Browser authentication uses a test-only identity, while real backend role lookup and authorization execute against the disposable database. This is not a live Supabase login test.

With the isolated Vite frontend on 127.0.0.1:5187 (see `APPOINTMENT_CALENDAR_REALISTIC_REVIEW.md` for its credential-free startup command), run:

```sh
SCHEDULE_BROWSER=disposable \
TEST_BASE_URL=http://127.0.0.1:5187 \
PLAYWRIGHT_MODULE=/Users/aleksandrgetmanenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
GIN_MODE=release bash backend/scripts/review-calendar-local.sh
```

`bash backend/scripts/test-media-local.sh` runs the complete actual PostgreSQL integration suite independently. No production `.env` is read by either test harness.

## Remaining limitations

- The user's original failing production request was not inspected; findings distinguish reproduced contract/workflow defects from the shared generic-error mapping.
- The normal local Go backend must run the updated source to expose the corrected admin options and validation details. This task's backend verification used isolated test servers; no deployment or user-owned server restart was performed.
- Activation can remain unavailable when real clinic services, durations, privacy confirmation or schedules are not configured. Those records were not changed.
- Existing period effective dates are preserved; this compact editor does not add a separate date-scoped schedule management interface.
- Unknown malformed requests still receive a safe contextual rejection rather than raw server diagnostics. Multiple-record CMS publication remains separate from schedule saving.
- The existing >500 kB frontend bundle warning remains.
- No production migrations/data changes, public booking/upload activation, email implementation, public design changes, commits, merges, pushes or deployments.

## Additional readiness rejection fix

An enabled doctor cannot lose every eligible service or working interval. That existing backend rejection (`booking_not_configured`) is now distinguished from an unavailable API. The UI explains the requirements and allows **explicitly disabling** booking while preserving the unsaved schedule. Activation remains blocked while dirty; disable uses the last saved configuration and does not falsely claim to save the pending schedule. The real browser suite verifies rejected removal → explicit disable → successful schedule save.

## Final verification results

| Suite | Result |
| --- | --- |
| Frontend production build | PASS; existing chunk-size warning only |
| Frontend unit tests | 103 passed |
| Real Go/PostgreSQL specialist browser | 24 LV/RU/EN × eight-width workflows passed |
| Specialist editor regression | 24 passed; includes stale edits, language drafts, actual tab/focus switching and role revocation |
| Specialist creation regression | 24 passed |
| Specialist linking | 6 passed; identities and CMS references preserved |
| Break / blocked date / vacation browser | 6 passed; final inclusive date inputs verified |
| Inline Media controls | 3 passed; no real uploads |
| Appointment browser | 24 passed |
| Booking browser | 172 layout checks, 31 flows passed |
| Auth browser | 96 layout checks and auth flows passed |
| Unauthorized admin access | 12 passed; no privileged requests |
| News / CMS browser | 24 passed |
| Actual PostgreSQL Go suite | All packages passed via `go test -count=1 -p 1 ./...` |
| `go vet ./...` | PASS |
| Hero locks | 15/15 passed |
| Whitespace | PASS, with the previously approved unchanged font-license exemptions |

The new backend tests specifically cover actionable invalid/overlap codes, valid adjacent-interval replacement with stable IDs, and full transaction rollback when a synthetic appointment would lose coverage. Existing PostgreSQL regressions cover DST, absence impacts, collisions, idempotency, authorization and CMS/Media preservation. Saved 24:00 end boundaries remain supported without accepting invalid start times.

Browser evidence covers new unsaved profiles, no services, empty schedule, enable/disable day, edit times, explicit copy, real save, reversed/overlapping inputs, error retention/retry and responsive overflow checks. All test data was synthetic. Disposable databases and servers were removed after execution.

One automatic permission-review timeout occurred before the first database test command started. Its allowed retry succeeded; there is no remaining permission blocker. A browser run interrupted by a Vite hot reload was rerun successfully against stable final source. Desktop and mobile after screenshots were visually inspected.
