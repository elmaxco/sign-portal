

# SignPortal

Modern e-signing for Swedish teams. Create, send, and sign agreements with BankID.

## Quick start
1. `npm install`
2. `npm run dev`
3. Open [localhost:3000](http://localhost:3000)

## Usage
- `/offer`: Customer offer form
- `/admin`: Admin dashboard
- `/sign/{token}`: Sign agreement (direct link)
- `/signup/{token}`: Sign agreement (link sent to recipient via email/SMS – same flow as `/sign`)
- `/sign/start`: Paste sign/signup link to navigate

## Public Offer Form Anti-Spam

The offer form is intentionally public (no login required), but it includes server-side anti-spam protections:

- IP-based rate limiting on `POST /api/offers/create`.
- Additional rate limiting for repeated submissions using the same email, org number, and phone number.
- Honeypot field detection (silent drop for bot-like submissions).
- Form-age verification to reject unrealistic submit timing.
- Payload length validation for free-text fields.

## Env vars
See `.env.example` for config (Resend, base URL, etc).

MIT License

## Environment Variables

The app uses server-side email sending (Resend) and scheduled reminders.

### Required for email sending

- `RESEND_API_KEY`: API key from Resend.
- `MAIL_FROM`: Sender address, must belong to a verified domain in Resend.

### AI summary for agreement PDF (admin)

- `GEMINI_API_KEY`: API key used to summarize PDF draft agreements into a short content text.

Optional:

- `GEMINI_SUMMARY_MODEL`: Gemini model name used for summary generation. Default: `gemini-2.0-flash`.
- `GEMINI_SUMMARY_MAX_INPUT_CHARS`: Max extracted PDF characters sent to AI. Default: `18000`.

### Optional email config

- `MAIL_VERIFIED_DOMAIN`: Domain validation for `MAIL_FROM`. Default: `signportal.starring.se`.
- `APP_BASE_URL`: Absolute app base URL used in email links (e.g. `https://your-domain.se`).
- `APP_PUBLIC_BASE_URL`: Optional override for `APP_BASE_URL` when building links.

### Signed notification emails

- `ADMIN_NOTIFY_EMAIL`: Internal admin recipient for "agreement signed" notices.
- `MAIL_ADMIN_NOTIFY_TO`: Alternative variable name for internal admin recipient.

When an agreement is signed successfully:

- The signer receives a confirmation email (receipt).
- Admin receives an internal notice if one of the admin notify env vars above is set.

### Cron reminders

- `CRON_SECRET` or `AGREEMENTS_REMINDER_SECRET`: Secret used by `/api/agreements/reminders`.

The reminder endpoint accepts both `GET` and `POST` and is scheduled via `vercel.json`.
Current cron schedule: `30 1 * * *` (UTC, nightly run).
Default reminder timing is 4 days for first reminder and 4 days between subsequent reminders.

Optional load-control env vars:

- `REMINDERS_MAX_ITEMS_PER_RUN` (default `25`)
- `REMINDERS_MAX_RUNTIME_MS` (default `45000`)

The reminders endpoint also uses a distributed Firestore lock to avoid overlapping runs.
If a run is already active, a new invocation returns `202` with `{ skipped: true }`.

## SMS Notifications (Twilio)

SMS is optional and only sent when all conditions are met:

- `SMS_ENABLED` is set to `true`.
- Twilio env vars are configured.
- Agreement has `recipientPhone`.
- Agreement has `recipientSmsConsent = true`.

### Feature flag

- `SMS_ENABLED`: Set to `true` to activate SMS sending.
- If unset or not `true`, SMS is skipped even when Twilio vars exist.
- `SMS_DEFAULT_COUNTRY_CODE`: Optional default country prefix used when phone is not in E.164. Default: `+46`.

### Required Twilio env vars

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (E.164 format, e.g. `+46701234567`)

## TIC Debug Logging

- `TIC_DEBUG_LOGS`: Optional debug flag for TIC callback/collect diagnostics.
- Default behavior is quiet logging in production.
- Set to `true` (or `1`, `yes`, `on`) only when actively troubleshooting TIC integration.

## Sign Proof / Audit Trail

When an agreement is marked as signed, the backend stores a structured `signProof` payload.

### `signProof` fields

- `version`: Current schema version (now `2`)
- `signedAtIso`: Server-side signing timestamp in ISO format
- `provider`: Identity/sign provider (`id.tic.io` by default)
- `sessionId`: TIC session identifier
- `result`: Normalized collect/callback result string
- `agreementIntegrityHash`: SHA-256 hash over key agreement snapshot fields (content + links + attachments metadata)
- `callback`: Whitelisted callback fields from TIC
- `collect`: Whitelisted collect fields from TIC

The payload intentionally uses a whitelist to avoid storing unbounded/raw external response bodies.

## Agreement Attachments

Attachments are stored privately in Firebase Storage and metadata is saved on each agreement document.

### Firestore model

- `attachments: AttachmentItem[]`
- `attachmentCount: number`

`AttachmentItem` fields:

- `id`
- `filename`
- `contentType`
- `size`
- `storagePath`
- `createdAt`
- `uploadedBy` (currently `"admin"`)

### Limits (MVP defaults)

- Max attachments per agreement: `10`
- Max file size per attachment: `10MB`
- Allowed content types: `application/pdf`, `image/png`, `image/jpeg`

### Required storage env vars

- `FIREBASE_STORAGE_BUCKET` (or `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`)

### API endpoints

- `POST /api/admin/agreements/attachments/upload` (multipart `token` + `file`)
- `GET /api/agreements/attachments/list?token=...`
- `GET /api/agreements/attachments/download?token=...&attachmentId=...`
- `DELETE /api/admin/agreements/attachments/delete` (`{ token, attachmentId }`)

Downloads use short-lived signed URLs (5 minutes) generated server-side.

### Storage rules

Client access is blocked by default in `storage.rules`. All attachment access should go through server APIs.

### Where SMS is sent

- Admin manual send sign link: `POST /api/admin/agreements/send`
- Automatic reminders (cron): `GET|POST /api/agreements/reminders`
- Offer conversion auto-send flow: `POST /api/admin/offers/create-agreement`

### Consent model (MVP)

- Offer form stores `smsConsent` from the checkbox.
- When an offer is converted to an agreement, `recipientPhone` and `recipientSmsConsent` are copied to the agreement.
- If consent is false, SMS is skipped even if phone number exists.
