# Employee journey audit

2026-10-10, feature/final-development. Read the acceptance report, limitations,
admin routes/navigation/editors and operational/CMS APIs. Actual signed-in browser
confirmed the Doctors page exposes only editorial content and a separate management
link. Baseline desktop/mobile screenshots use synthetic data, not production edits:
`docs/screenshots/admin-simple/before-{doctors,services,news,pages}-{390,1440}.png`.

## Prioritized findings

| Priority | Journey | Before | Required improvement |
|---|---|---|---|
| P1 | Add doctor | Doctors → booking offerings → Add; service assignments require another section | One visible contextual Add doctor action; unified ID/profile/services/hours save and readiness |
| P1 | Add news | News → generic Create website content → choose type | News → Add news, contextual editor |
| P1 | Add service | Services → booking offerings → Add | Add service at heading; explain published price ownership |
| P1 | Add page / FAQ | Generic editor; FAQ hidden in type selector | Add page / Add question in Pages and FAQ context |
| P1 | Activate doctor | Independent checkboxes permit incomplete setup | Server-validated readiness and atomic related writes |
| P2 | Dashboard | Counts first; common actions require navigation | Clear daily-task actions and honest setup guidance |
| P2 | Schedule | Generic Add with mode switching; no obvious break/vacation actions | Named actions and explicit doctor context |
| P2 | Content form | Slug/order/SEO ahead of content; all fields required | Basics first, safe derived address, advanced SEO/order |
| P2 | Media | Picker already in editors; upload gated | Preserve contextual picker; explain disabled uploads truthfully |
| P2 | Settings | General technical copy; booking/notifications placeholders | Recognizable grouping and capability explanations |

Baseline Add doctor/service requires at least 2 clicks after opening its section;
news/page/FAQ requires selecting context in a generic editor. Target: 1 click from
each section to its named Add form (not counting form completion). Automated click
counts are not a real-user study. Existing public website design is out of scope.

## Constraints found

Operational doctor profiles already store editorial links, biography, qualifications
and portrait references. Doctor-service assignments and schedules exist separately.
They must be saved under the existing configuration lock and optimistic revision,
not by a fragile sequence of independent browser writes. Website prices remain
owned by published CMS price rows. No new production schema or content is authorized.
