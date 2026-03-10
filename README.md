This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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
Default reminder timing is 4 days for first reminder and 4 days between subsequent reminders.

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
