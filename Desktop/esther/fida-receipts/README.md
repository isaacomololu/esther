# FIDA Receipts

NestJS web app that issues cash-payment receipts to FIDA Nigeria (Philomath
University Student Chapter) members when they scan an event QR code. Google
Sheets is the database — no separate DB to run.

## Flow

1. Member scans the printed QR → lands on `/`.
2. Enters their email.
3. **Found** → page shows their record, they fill in `matric_no` and `level`, confirm the payment amount, and receive a receipt.
4. **Not found** → full registration form → same confirm → receipt.
5. Repeat scans with the same email return the existing receipt (no double-charging).

## Prerequisites

- Node 20+
- pnpm 9+
- A Google Sheet shared with a Google service account
- The service account's JSON key

## Google Sheet setup

1. Create a new sheet (name it whatever you like — e.g. `FIDA_Event_Payments`).
2. On the first tab (default name `Members`, or set `SHEET_TAB` in `.env`), paste this header into row 1:
   ```
   id  name  designation  phone  email  matric_no  level  amount  paid  paid_at  receipt_no  created_at
   ```
3. Import the initial membership data by pasting the rows from `../fida_members.csv` (in the parent directory).
4. In Google Cloud Console, create a service account, enable the **Google Sheets API**, and download its JSON key.
5. Share the sheet with the service account's email (`...@...iam.gserviceaccount.com`) as **Editor**.

## Configure

```bash
cp .env.example .env
```

Fill in:
- `SHEET_ID` — the `...docs.google.com/spreadsheets/d/<THIS>/edit` part.
- `GOOGLE_CLIENT_EMAIL` — from the JSON key file.
- `GOOGLE_PRIVATE_KEY` — from the JSON key, wrapped in double quotes with literal `\n`s preserved.
- `EVENT_AMOUNT` — the fixed cash amount (e.g. `2000`).
- Tweak `EVENT_NAME`, `RECEIVED_BY_*`, `RECEIPT_PREFIX` as needed.

## Run

```bash
pnpm install
pnpm start:dev      # local dev
# or
pnpm build && pnpm start:prod
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Render free tier)

1. Push this folder to GitHub.
2. On Render → **New → Web Service** → pick the repo.
3. Build command: `pnpm install && pnpm build`
4. Start command: `pnpm start:prod`
5. Add every variable from `.env` as an environment variable in the Render dashboard.
6. Deploy. Grab the public URL.

## Generate the QR code

1. Copy the deployed URL (e.g. `https://fida-receipts.onrender.com/`).
2. Paste into [qr-code-generator.com](https://www.qr-code-generator.com/).
3. Download the PNG, print large, display at the event.

## API surface

All responses follow the `{ message, data }` shape.

| Method | Path                         | Purpose                                        |
| ------ | ---------------------------- | ---------------------------------------------- |
| GET    | `/api/attendees/lookup?email=` | Find a member by email                        |
| POST   | `/api/attendees`             | Register a new member                          |
| POST   | `/api/payments`              | Mark member paid + return receipt (idempotent) |
| GET    | `/api/receipts/:receiptNo`   | Fetch a receipt by its number                  |

## Dry-run checklist before the event

- [ ] Test with a real member email from the sheet → receipt renders correctly.
- [ ] Test with an unknown email → registration flow works.
- [ ] Re-scan with the same email → returns the existing receipt, no duplicate row.
- [ ] Test on a phone (not just desktop).
- [ ] Print the QR and test scanning from ~1 meter away.
- [ ] Confirm the Google Sheet updates in real time.
