# Clinic photography inventory and replacement plan

Historical inventory reviewed 2026-10-15 on `feature/clinic-photography`. Subsequent approved integration is documented in REAL_CLINIC_MEDIA_INTEGRATION.md; the recommendations and pending decisions below describe the original inspection checkpoint. Existing specialist portraits were preserved.

## Verified collection

Source: `/Users/aleksandrgetmanenko/Downloads/AG-Dental-Clinic-Photography-2026-10-15/web`.

70 WebP photographs, all successfully decoded at full resolution. Total **10,972,988 bytes (10.97 MB / 10.46 MiB)**. Sizes range from 56,092 to 738,554 bytes. No identical SHA-256 hashes. `_DS_Store` is metadata and excluded. No video is present. JPEGs are **not required** for the proposed initial use: these are adequately sized web exports. Request an individual JPEG only if a later large crop or high-density display reveals an actual quality limitation.

Dimensions: 1600×2000: 35 files, 2400×1632: 8 files, 1600×2400: 13 files, 2400×1600: 14 files.

All 70 were visually reviewed in numbered contact sheets; leading reception, room, portrait and group candidates were also enlarged. This is an editorial review, not a claim that every pixel of every photograph was examined at native zoom. No broad motion-blur failure was apparent at review size. Background softness in portraits is intentional. Warm indoor white balance and some bright window/ceiling highlights are consistent across the set; do not apply aggressive filters.

## Contact sheets (outside Git)

- [Sheet 1](/Users/aleksandrgetmanenko/Downloads/AG-Dental-Clinic-Photography-2026-10-15/review/contact-1.png) — photographs 1–15.
- [Sheet 2](/Users/aleksandrgetmanenko/Downloads/AG-Dental-Clinic-Photography-2026-10-15/review/contact-2.png) — photographs 16–30.
- [Sheet 3](/Users/aleksandrgetmanenko/Downloads/AG-Dental-Clinic-Photography-2026-10-15/review/contact-3.png) — photographs 31–45.
- [Sheet 4](/Users/aleksandrgetmanenko/Downloads/AG-Dental-Clinic-Photography-2026-10-15/review/contact-4.png) — photographs 46–60.
- [Sheet 5](/Users/aleksandrgetmanenko/Downloads/AG-Dental-Clinic-Photography-2026-10-15/review/contact-5.png) — photographs 61–70.

[Machine-readable dimensions, byte sizes and SHA-256 inventory](/Users/aleksandrgetmanenko/Downloads/AG-Dental-Clinic-Photography-2026-10-15/review/metadata.json). Original WebPs were read only; previews are separate derived files.

## Recommended replacements — retain existing frames and design

| Existing placement | Preferred file | Alternative / responsive treatment |
|---|---|---|
| Homepage architectural About image (`HomeView`, `media.room`) | #50 `DSCF4390.webp` | #52 `DSCF4395.webp` for tall mobile composition; keep chair central, do not stretch |
| Homepage clinic editorial photo (`ClinicGallery`) | #54 `DSCF4403.webp` | #56 `DSCF4411.webp` where the current tall/square frame crops the wide reception too heavily |
| `/par-mums` opening square image (`media.original`) | #56 `DSCF4411.webp` | Square crop keeping receptionist’s face and desk; starting focal point 55% / 45%, verify in actual frame |
| Existing lead-doctor portrait (`media.doctor`) | #3 `DSCF4164.webp`, **pending identity confirmation** | #2 `DSCF4156.webp`; 4:5 source is suited to existing portrait frame; protect head and hands |
| Other existing specialist records | #12 `DSCF4206.webp`, #21 `DSCF4250.webp`, #32 `DSCF4313.webp` | Assign only after clinic confirms names/roles. Do not create new specialist records from photos alone |
| Team image where an existing wide slot is appropriate | #43 `DSCF4368.webp` | #40 `DSCF4357.webp`; use whole landscape. Not suitable for existing square frame without losing people |
| Service index / general dental consultation image | #50 `DSCF4390.webp` | #49 `DSCF4389.webp`; contextual room photography only, not evidence of a particular procedure |
| Hygiene-related secondary image, if an existing slot needs it | #46 `DSCF4382.webp` | #48 `DSCF4387.webp` vertically; commercial product branding makes this a weaker primary choice |
| Existing contact/arrival image slot, if any | #64 `DSCF4439.webp` | #67 `DSCF4443.webp` for sign, #69 `DSCF4450.webp` for entrance; do not add a new section |
| Family-friendly supporting detail, if already needed | #61 `DSCF4423.webp` | Show the actual children’s corner; do not imply unconfirmed clinical services |

### Hero recommendation — approval needed, no implementation change

#54 `DSCF4403.webp` is the best **desktop still** candidate: calm reception, person right of centre, quieter left area for the existing copy. Its bright white wall still requires testing with the existing overlay and unchanged text; no contrast pass is claimed. A tall mobile crop loses much of the architecture and can place the person behind copy. #52 `DSCF4395.webp` is a more flexible mobile room still, with #44 `DSCF4378.webp` as a darker alternative. These are proposed art-directed still sources, not a replacement for scroll video. No approved video was supplied; real scroll-video footage remains outstanding. Preserve Hero behavior, modes, composition and protected files.

### Desktop/mobile composition constraints

Portraits fit narrow frames naturally; start centred with eyes near the upper third. Wide room photographs suit desktop 3:2/16:9 areas; use the supplied vertical room counterpart rather than an extreme phone crop. Reception #56 works better than #54 in a square/tall editorial frame. Team photographs must remain landscape to retain everyone; do not force them into the current square About slot. Exterior #64 is useful at 4:3; narrow crops need the sign and access route retained. These are composition assessments from the files and current templates, **not browser screenshots of integrated replacements**.

## Redundancy and exclusions

No byte-identical duplicates. Visually similar sequences: #1–10, #11–19, #20–30, #31–35 (portraits); #36–43 (team); #49–51 and #52–53 (room); #55–56 (reception); #57–58; #62–63; #64–67 (exterior). Select one primary per group, retain alternatives outside the application.

#57–58 deliberately blur the person: unsuitable as portraits or main clinic images. #45–48 have stronger window contrast and promotional-product emphasis. #51/#53 include intrusive door edges. #70 contains street vehicles/plates: prefer #64 for wayfinding. No images are deleted. Confirm staff identities and publication permission before assigning named profiles; do not infer clinical qualifications from clothing. No treatment/procedure photography was supplied, so keep existing accurate service imagery where these room/detail photos are not semantically appropriate.

## Full numbered inventory

| # | File | Pixels | Orientation | Bytes | Review / proposed use |
|---:|---|---|---|---:|---|
| 1 | 1.webp | 1600×2000 | Portrait | 104,936 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 2 | DSCF4156.webp | 1600×2000 | Portrait | 116,636 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 3 | DSCF4164.webp | 1600×2000 | Portrait | 95,028 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 4 | DSCF4166.webp | 1600×2000 | Portrait | 122,380 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 5 | DSCF4167.webp | 1600×2000 | Portrait | 110,078 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 6 | DSCF4168.webp | 1600×2000 | Portrait | 104,728 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 7 | DSCF4176.webp | 1600×2000 | Portrait | 107,782 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 8 | DSCF4197.webp | 1600×2000 | Portrait | 110,770 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 9 | DSCF4202.webp | 1600×2000 | Portrait | 117,176 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 10 | DSCF4203.webp | 1600×2000 | Portrait | 113,042 | Portrait A; select #3, alternative #2; similar poses. Confirm identity before assignment. |
| 11 | DSCF4205.webp | 1600×2000 | Portrait | 107,352 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 12 | DSCF4206.webp | 1600×2000 | Portrait | 106,294 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 13 | DSCF4207.webp | 1600×2000 | Portrait | 100,892 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 14 | DSCF4221.webp | 1600×2000 | Portrait | 94,952 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 15 | DSCF4222.webp | 1600×2000 | Portrait | 97,164 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 16 | DSCF4223.webp | 1600×2000 | Portrait | 95,058 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 17 | DSCF4227.webp | 1600×2000 | Portrait | 98,006 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 18 | DSCF4245.webp | 1600×2000 | Portrait | 101,170 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 19 | DSCF4246.webp | 1600×2000 | Portrait | 104,976 | Portrait B; select #12, alternative #14; tighter #16–19 less flexible. Identity pending. |
| 20 | DSCF4249.webp | 1600×2000 | Portrait | 84,968 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 21 | DSCF4250.webp | 1600×2000 | Portrait | 88,958 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 22 | DSCF4255.webp | 1600×2000 | Portrait | 87,920 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 23 | DSCF4259.webp | 1600×2000 | Portrait | 80,376 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 24 | DSCF4260.webp | 1600×2000 | Portrait | 83,288 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 25 | DSCF4262.webp | 1600×2000 | Portrait | 79,474 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 26 | DSCF4263.webp | 1600×2000 | Portrait | 78,992 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 27 | DSCF4274.webp | 1600×2000 | Portrait | 82,174 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 28 | DSCF4275.webp | 1600×2000 | Portrait | 80,966 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 29 | DSCF4279.webp | 1600×2000 | Portrait | 82,306 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 30 | DSCF4284.webp | 1600×2000 | Portrait | 77,418 | Portrait C; select #21, alternative #27; many near-duplicate poses. Identity pending. |
| 31 | DSCF4312.webp | 1600×2000 | Portrait | 98,602 | Portrait D; select #32, alternative #35. Identity/role pending. |
| 32 | DSCF4313.webp | 1600×2000 | Portrait | 102,146 | Portrait D; select #32, alternative #35. Identity/role pending. |
| 33 | DSCF4314.webp | 1600×2000 | Portrait | 108,936 | Portrait D; select #32, alternative #35. Identity/role pending. |
| 34 | DSCF4318.webp | 1600×2000 | Portrait | 90,962 | Portrait D; select #32, alternative #35. Identity/role pending. |
| 35 | DSCF4319.webp | 1600×2000 | Portrait | 113,878 | Portrait D; select #32, alternative #35. Identity/role pending. |
| 36 | DSCF4339.webp | 2400×1632 | Landscape | 151,294 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 37 | DSCF4346.webp | 2400×1632 | Landscape | 153,332 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 38 | DSCF4347.webp | 2400×1632 | Landscape | 165,104 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 39 | DSCF4350.webp | 2400×1632 | Landscape | 164,812 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 40 | DSCF4357.webp | 2400×1632 | Landscape | 162,390 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 41 | DSCF4365.webp | 2400×1632 | Landscape | 143,488 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 42 | DSCF4366.webp | 2400×1632 | Landscape | 150,976 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 43 | DSCF4368.webp | 2400×1632 | Landscape | 152,860 | Team group; select #43, alternative #40. Keep all four people; avoid narrow cover crops. |
| 44 | DSCF4378.webp | 1600×2400 | Portrait | 139,240 | Vertical room: mobile room/optional still fallback; dark, strong floor highlight. |
| 45 | DSCF4380.webp | 1600×2400 | Portrait | 131,730 | Desk detail; secondary only, bright window and deep shadows. |
| 46 | DSCF4382.webp | 2400×1600 | Landscape | 130,728 | Product display; secondary hygiene context, prominent third-party branding. |
| 47 | DSCF4384.webp | 2400×1600 | Landscape | 96,190 | Product display alternative; not a main service image. |
| 48 | DSCF4387.webp | 1600×2400 | Portrait | 90,262 | Vertical product display; limited context, secondary only. |
| 49 | DSCF4389.webp | 2400×1600 | Landscape | 156,422 | Treatment room alternative; clipped foreground stool. |
| 50 | DSCF4390.webp | 2400×1600 | Landscape | 158,898 | Preferred treatment-room landscape; clear chair and equipment. |
| 51 | DSCF4394.webp | 2400×1600 | Landscape | 152,370 | Room alternative; door edge intrudes at right. |
| 52 | DSCF4395.webp | 1600×2400 | Portrait | 147,642 | Preferred vertical room for mobile/editorial tall frame. |
| 53 | DSCF4396.webp | 1600×2400 | Portrait | 145,990 | Near-duplicate vertical room; door edge less clean. |
| 54 | DSCF4403.webp | 2400×1600 | Landscape | 275,492 | Preferred reception landscape; useful left-side breathing room. |
| 55 | DSCF4410.webp | 2400×1600 | Landscape | 135,060 | Reception close-up alternative; preserve person and desk. |
| 56 | DSCF4411.webp | 2400×1600 | Landscape | 140,268 | Preferred square/tall reception crop source; keep face above crop edge. |
| 57 | DSCF4414.webp | 1600×2400 | Portrait | 71,298 | Deliberate shallow focus: person blurred; detail only, not portrait. |
| 58 | DSCF4415.webp | 1600×2400 | Portrait | 69,808 | Near-duplicate blurred-person detail; omit from initial selection. |
| 59 | DSCF4419.webp | 1600×2400 | Portrait | 473,456 | Children’s corner overhead; secondary only. |
| 60 | DSCF4422.webp | 1600×2400 | Portrait | 136,040 | Children’s corner detail; branding prominent, limited context. |
| 61 | DSCF4423.webp | 1600×2400 | Portrait | 399,460 | Preferred children’s corner; do not imply unverified treatment services. |
| 62 | DSCF4426.webp | 1600×2400 | Portrait | 56,092 | Reception card/sign detail; check printed information before reuse. |
| 63 | DSCF4427.webp | 1600×2400 | Portrait | 65,312 | Near-duplicate sign detail; omit from initial selection. |
| 64 | DSCF4439.webp | 2400×1600 | Landscape | 359,582 | Preferred exterior wayfinding; sign and access route visible. |
| 65 | DSCF4440.webp | 2400×1600 | Landscape | 467,828 | Exterior alternative; more shadow/foliage. |
| 66 | DSCF4442.webp | 2400×1600 | Landscape | 321,676 | Exterior alternative; foreground gate competes. |
| 67 | DSCF4443.webp | 2400×1600 | Landscape | 394,862 | Useful closer clinic-sign/exterior view. |
| 68 | DSCF4447.webp | 2400×1600 | Landscape | 204,802 | Sign close-up; secondary brand detail, not main Hero. |
| 69 | DSCF4450.webp | 1600×2400 | Portrait | 639,886 | Entrance door: useful arrival information; not aspirational Hero. |
| 70 | DSCF4454.webp | 2400×1600 | Landscape | 738,554 | Street context; parked cars/plates require review before use. |

## Implementation steps after approval

1. Approve the shortlist and confirm portrait identities, especially which file corresponds to each existing specialist. No automated face identification was used.
2. Map each approved replacement to its existing media reference; inspect shared-reference consumers so a room replacement does not unintentionally change another page. Keep public copy, layouts, prices, URLs and SEO unchanged.
3. Preserve the supplied WebPs untouched outside Git. Produce only necessary responsive derivatives (480/768/1024/1440; up to 1920/2400 for wide frames, never wider than source). Portraits need at most their 1600-pixel source width. Existing files are already compact: avoid re-encoding unchanged full-size WebPs without a demonstrated benefit. Evaluate optional AVIF against WebP visually before choosing; no guaranteed savings claimed.
4. Set correct intrinsic dimensions and `srcset`/`sizes`. Strip unnecessary EXIF/location metadata from derived assets; retain natural colour. Keep below-fold lazy loading; load only the selected Hero still eagerly if separately approved. No new animation or layout.
5. Compare approved crops at 320/375/390/430/1440px in LV/RU/EN and check headroom, people, signs, contrast and layout stability. Run existing responsive regressions/build/Hero locks during integration. Additional protected-file changes require the existing approval process.

## Verification and change boundary

70/70 full image decodes passed; SHA-256 inventory contains 70 unique hashes. Five numbered contact sheets cover all images. Repository change: only `docs/CLINIC_PHOTOGRAPHY_INVENTORY.md` (updated from the earlier download-blocked report). Preview PNGs and metadata JSON are outside Git in the `review` folder. No website images, Hero, CMS, Supabase or Storage changed. No commit, push, merge or deployment. Application build/regression tests were not needed for this documentation-only review. Await photo-placement approval before integration.
