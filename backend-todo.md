# Backend TODO

Items requiring backend work that cannot be done client-side with the Agent SDK.

---

## Hard Delete

- [ ] **Delete student account** — Hard-delete a student: wipe credential data, encrypted user info, and associated Agent state. The Agent SDK has no `delete` operation — only `archived = true` (soft-delete). May be required for GDPR.
- [ ] **Delete group** — Hard-delete a group and cascade-remove all associated `group_members` records. Same issue — no SDK delete primitive.

## Assignment Submission Tracking

- [ ] **Submission tracking** — Per-student-per-assignment records with status (`not-started`, `in-progress`, `submitted`, `graded`) and timestamps. This is an entirely new feature — the original platform has no submission tracking at all. Progress bars currently show fake data.
- [ ] **Submission statistics query** — Aggregate counts per assignment (total assigned, started, submitted, graded) to power the progress bars in the assignments list.

## Scheduled Publishing

- [ ] **Scheduled publish job** — Server-side task to transition assignments from `Scheduled` to `Published` when `scheduledDate`/`scheduledTime` is reached. Frontend saves these values to Agent state but nothing acts on them.

## SSO Integration

- [ ] **Google Workspace OAuth** — Server-side OAuth2 flow for student account import and linking.
- [ ] **Microsoft 365 OAuth** — Same for Microsoft 365.
