# Clinic administrator guide

The client-facing administration panel has exactly three main sections:
**Appointments, Specialists and News**. This guide reflects the current simplified
interface. An unavailable message means the API, authorization or required setup
is unavailable; it does not mean a save succeeded.

## Sign in

Use an authorized account. Public registration does not grant administrator access.
The language switch changes the interface; a content-language selector changes the
text being edited. Unsaved changes require a deliberate discard when leaving.
Do not assume an unsaved draft survives closing the browser. Revoked access hides
private editors and patient information.

## Appointments

Choose Day, Week or Month and use the date navigation. Select an appointment for
its details and history. Confirm, reschedule or cancel only when the action is
available. Rescheduling offers actual available times and checks again when saved.
If another person takes the slot, choose another time; do not repeatedly submit.

Use **Add appointment** to select an approved service, specialist and available
time, then enter the patient's minimal contact information and required privacy
acknowledgement. Never enter diagnoses or identity numbers. A booking reference
means the API saved the appointment. It does not mean an email was sent.

## Specialists

Use **Add specialist** in this section. Save the name/profile, then use the Services
and Schedule tabs. Existing approved biography translations and a valid portrait
can be reused; do not invent qualifications or re-upload an existing valid image.
Resolve field-specific validation messages. A save is distinct from publishing
editorial content and from enabling online booking.

Select only existing approved services. Clinic employees cannot create services or
edit prices or durations, including through another admin section. Request those
changes through the authorized technical/clinic approval process. The public price
list remains available and unchanged by this interface restriction.

Configure weekly hours in the specialist's Schedule tab. Manage breaks, blocked
days and vacations directly in that editor. All scheduling uses Riga local time.
Changes that conflict with active appointments must be resolved deliberately.
Enable booking only after the required service, hours and privacy setup is ready.
Incomplete or disabled specialists do not become bookable merely because they exist.

## News

Use **Add news**. Complete LV/RU/EN title and article text and choose an image inside
the editor. Save a draft, preview, then publish deliberately. A draft does not change
the public article. After publishing, use the public link to check the result.
Unpublish to remove public visibility. Review history before restoring an earlier
version. Slugs and revision references are protected; do not work around conflicts
by creating duplicate articles.

## Images and protected content

Images are selected inside Specialist and News editors; there is no separate Media
Library page in the clinic interface. Production uploads remain disabled until
separately approved. Historical references may prevent deletion even after an
article is unpublished. This protects old revisions and shared images.

The homepage video Hero, poster, scroll behavior and Welcome Intro are not clinic
editing tasks. Services/prices, generic website-page editing, SEO/settings and
contact inbox management are not additional client-facing navigation sections.
Their retained technical infrastructure does not authorize bypassing this interface.

## Unavailable features and support

If a save fails, read the specific error and keep your draft. An unknown network
outcome is not confirmed success. Reopen only after checking the result; booking
retries preserve an idempotency key to prevent duplicate appointments.
Contact questions have no message delivery service: use the displayed clinic phone
or email. Email notifications, reminders and Resend are not implemented.

Local synthetic acceptance evidence: [FINAL_E2E_ACCEPTANCE.md](FINAL_E2E_ACCEPTANCE.md).
Hosted deployment, actual clinic setup and staff sign-off remain separate gates.
