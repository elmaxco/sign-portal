
# SignPortal

SignPortal is a modern e-signing platform for Swedish and Nordic teams. Create agreements, send signing links, and track every step in a fast, secure, and user-friendly workflow.

## Features

- Public offer form for new customers
- Admin dashboard for managing agreements and offers
- E-signing with BankID
- Attachments and linked content support
- Automated email and SMS reminders
- Secure download and audit trail

## Getting Started

1. Install dependencies:
	```bash
	npm install
	```
2. Start the development server:
	```bash
	npm run dev
	```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- Visit `/offer` to submit a new offer request as a customer.
- Admins can log in at `/admin` to manage agreements and offers.
- Recipients sign agreements via unique links (e.g. `/sign/{token}`).

## Deployment

Deploy on [Vercel](https://vercel.com/) or your preferred Node.js hosting. Configure environment variables as below.

## Environment Variables

See `.env.example` for all required and optional variables.

- `RESEND_API_KEY`: API key for Resend (email delivery)
- `MAIL_FROM`: Sender email (must be verified)
- `APP_BASE_URL`: Public base URL (e.g. https://your-domain.se)
- `ADMIN_NOTIFY_EMAIL`: Internal admin notification address

## Demo

Contact info@signportal.se for a live demo or onboarding help.

## License

MIT

## Environment Variables

The app uses server-side email sending (Resend) and scheduled reminders.

### Required for email sending

- `RESEND_API_KEY`: API key from Resend.
- `MAIL_FROM`: Sender address, must belong to a verified domain in Resend.

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
