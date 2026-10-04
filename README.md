# Global Talent Lab — Funnel V2

Replaces **site → Google Form → manual review → WhatsApp → payment link** with:

**Traffic → site → free on-site assessment → instant A/B/C result → £49 Stripe checkout → Cal.com booking → automatic confirmation → nurture → higher-value services**, with every step recorded against the lead's original campaign / influencer.

Stack: Next.js 15 (App Router) · Prisma (SQLite locally, Postgres in production) · Stripe Checkout · Cal.com · Resend (email) · WhatsApp Cloud API (optional) · GA4 / Meta Pixel / Google Ads (after consent).

## Run locally

```bash
npm install
cp .env.example .env        # already done in this repo for dev; set ADMIN_PASSWORD
npx prisma db push          # creates prisma/dev.db
npm run dev                 # http://localhost:3000
npm test                    # scoring-engine tests
```

With no Stripe / Cal.com / Resend keys the app runs end-to-end in **dev mocks**: a mock checkout page, a mock slot picker, and emails printed to the server console. Mocks are disabled automatically in production.

Admin: `/admin` (password = `ADMIN_PASSWORD`).

## Deploying on your own server (pm2)

`ecosystem.config.cjs` defines two pm2 processes:

- **gtl-web** — the site on port **3199** (3000 is taken on the server). To use another port, change `GTL_PORT` in the file or start with `GTL_PORT=3200 pm2 start ecosystem.config.cjs`.
- **gtl-nurture-cron** — every hour it calls `/api/cron/nurture` on the local site and exits (no crontab needed). It reads `CRON_SECRET` from `.env`.

SQLite on a single server is fine: keep `provider = "sqlite"` and one `gtl-web` instance.

First time:

```bash
git clone https://github.com/usman-pal/gtvlab.git
cd gtvlab
npm ci
# copy .env and prisma/dev.db onto the server
# set NEXT_PUBLIC_SITE_URL=https://globaltalentlab.services in .env BEFORE building
npx prisma db push          # makes sure tables match the schema; keeps existing data
npm run build
pm2 start ecosystem.config.cjs
pm2 save                    # and `pm2 startup` once, if pm2 isn't already set to start on boot
```

Point nginx (or your proxy) for globaltalentlab.services at `http://127.0.0.1:3199`.

Updating:

```bash
git pull
npm ci
npx prisma db push
npm run build
pm2 reload gtl-web
```

Logs: `pm2 logs gtl-web` and `pm2 logs gtl-nurture-cron`.

## Where things live

| What | Where |
|---|---|
| Homepage copy & section order | `app/page.tsx` |
| Prices, deliverables, founder facts, disclaimers, testimonials | `lib/site-config.ts` |
| FAQ | `lib/faq.ts` |
| Assessment questions/options | `lib/assessment-options.ts` |
| **Scoring weights & A/B/C thresholds** | `lib/scoring-config.ts` (bump `SCORING_VERSION` when you change them) |
| Result pages (A/B/C) | `app/assessment/result/[token]/page.tsx` |
| Email copy (result, nurture sequence, confirmations) | `lib/email-templates.ts` |
| Nurture schedule & WhatsApp | `lib/messaging.ts` |
| Funnel metrics | `lib/metrics.ts` |

## Funnel behaviour

- **Assessment** (`/assessment`): 7 steps, progress bar, auto-advance on single-choice answers, draft saved in the browser so a closed tab resumes where it left off. Contact details are asked last. Honeypot + rate limit against spam.
- **Scoring**: deterministic weighted rules (profession, experience, seniority, evidence types, measurable achievement). Out-of-scope professions and "no evidence" are always C. Experience alone never rejects anyone. The score is internal and never shown.
- **Result URL**: `/assessment/result/{32-char random token}` — not guessable, not sequential, `noindex`.
- **A / B**: strengths, the "questionnaire cannot determine whether you qualify" caveat, and the £49 offer → Stripe → `/book/{token}` → Cal.com embed → `/book/{token}/confirmed`.
- **C**: respectful "not the right next step yet", guidance, and a "Send Me Global Talent Guidance" opt-in (educational sequence, no upsell).
- **Upsell**: when you mark a lead *Review completed* in the admin, their result page offers the £369 Evidence Audit and £1,899 Strategy with checkout, so higher-ticket purchases keep the original attribution. You can also record off-Stripe payments on the lead page.
- **Nurture** (A/B who haven't paid): result email immediately, then days 2, 5, 9, 14, 21, 30. Stops automatically on payment, unsubscribe, or status *Not suitable / Lost*. WhatsApp (only with explicit consent): one message after 15 minutes + one follow-up on day 4.
- **Attribution**: `utm_*` and `?ref=` captured on landing (first touch kept, latest touch also stored), saved on the lead, copied to Stripe metadata and every payment.

## Go-live checklist

1. **Database** — create a Postgres DB (Neon / Supabase / Vercel Postgres). In `prisma/schema.prisma` change `provider = "sqlite"` to `"postgresql"`, set `DATABASE_URL`, run `npx prisma db push`.
2. **Secrets** — set `APP_SECRET` (random 32+ bytes), `ADMIN_PASSWORD` (strong), `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL=https://globaltalentlab.services`.
3. **Stripe** — set `STRIPE_SECRET_KEY`. Add a webhook endpoint `https://globaltalentlab.services/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`; put its signing secret in `STRIPE_WEBHOOK_SECRET`. Test with Stripe test keys first.
4. **Cal.com** — create a 30-minute event type "Personal Eligibility Review" with a video location (Cal Video / Google Meet / Zoom), make it **hidden** (so it can't be booked without paying), set `NEXT_PUBLIC_CAL_LINK=yourname/eligibility-review` (a full `https://cal.com/yourname/eligibility-review` URL also works). Add a webhook to `https://globaltalentlab.services/api/cal/webhook` for Booking Created / Rescheduled / Cancelled with a secret → `CAL_WEBHOOK_SECRET`. Cal.com sends the attendee confirmation with time, timezone, video link and reschedule link; we send our own confirmation with preparation instructions.
5. **Email** — create a Resend account, verify the `globaltalentlab.services` domain (SPF/DKIM), set `RESEND_API_KEY` and `EMAIL_FROM`.
6. **Cron** — `vercel.json` calls `/api/cron/nurture` hourly (Vercel sends `CRON_SECRET` automatically; the Hobby plan only allows daily — that's fine for day-based nurture). Elsewhere, call it with `Authorization: Bearer $CRON_SECRET`.
7. **WhatsApp (optional)** — without credentials, WhatsApp messages appear on the lead page as one-click `wa.me` links with the personalised text. For automation, set up the WhatsApp Cloud API, get two templates approved (3 body params: first name, strength, booking URL) and set the `WHATSAPP_*` vars.
8. **Analytics** — `NEXT_PUBLIC_GA_ID` (currently G-XFTTFDNLPJ). Mark `review_purchased`, `audit_purchased`, `full_service_purchased` and `lead_a`/`lead_b` as key events in GA4. Optional: `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`.
9. **Import old leads** — export each Google Form's responses as CSV, optionally add `Contacted` / `Converted` / `Revenue` columns, then `npm run import:legacy -- responses.csv --dry-run` and without `--dry-run`. They're stored as `legacy_google_form`, excluded from cohort metrics, and never emailed.
10. **Legal review** — `/privacy` and `/terms` are templates; have them (and the scope/regulatory wording in `lib/site-config.ts`) reviewed before launch.

## Discount codes & payment help

- **Discount codes** (`/admin/discounts`): create percentage codes (1–100%), optionally limited to specific services, a maximum number of paid uses and an expiry date; disable/enable any time. Customers enter the code under "Have a discount code?" on the pay button and see the new price before paying; the server re-validates it at checkout and charges the discounted amount through Stripe. A 100% code skips Stripe and goes straight to booking. Payments record the list price, code and % off, and revenue metrics use the amount actually paid. Codes created in the Stripe dashboard are **not** accepted — create them here so they are tracked.
- **Having trouble paying?** (under every pay button): the customer gives the country they are paying from and what went wrong. You get an email at `ADMIN_NOTIFY_EMAIL` (or the contact address) with **reply-to set to the customer**, they get an acknowledgement, and the request is saved as a note on the lead and flagged on the dashboard until they pay. If you take payment another way (bank transfer, Wise, PayPal…), record it on the lead page so revenue and attribution stay correct.

## Application Audit (direct route)

For people who've already prepared their application. The homepage "Get My Application Reviewed" button goes to `/audit`: what we review, then 7 screening questions (route, criteria claimed, readiness of evidence / letters / personal statement, submitted?, when submitting, previous refusal, concerns) plus contact details — no eligibility questionnaire. That creates a lead with `origin = audit_intake` (attribution kept; excluded from assessment and A/B/C counts) and sends them to `/audit/{token}`, which shows their answers, the service and price, then **pay → book immediately** (Stripe, then the Cal.com audit event) → booking confirmation with preparation steps. The answers and booking show on the admin lead page. Audit purchases made from the result page also land on `/audit/{token}` to book.

**Setup:** create a hidden 90-minute Cal.com event for the audit and set `NEXT_PUBLIC_CAL_AUDIT_LINK` (the existing Cal.com webhook handles it — make sure the webhook covers this event type).

## Application Strategy & Evidence Programme (client portal)

Invite-only programme (£1,899 = £999 Phase 1 + £900 Phase 2) for applicants after their Eligibility Review. Everything hangs off the **same Lead**, so the original source / campaign / ref is kept to the end and every payment adds to the lead's revenue (a £59 review client who completes the programme shows as £1,958 on Campaigns & influencers).

**Flow:** admin opens the applicant → **Invite for Application Strategy** (confirmation modal, optional personal note) → email with a single-use link that expires in 21 days → applicant creates a portal account (email fixed to the invited address) → pays £999 (Stripe Checkout, confirmed by webhook) → Stage 1 opens → books Session 1 → **admin** marks Stage 1 complete → Stage 2 opens → admin marks Stage 2 complete (Phase 1 complete) → client pays £900 → Stage 3 → admin marks Stage 3 complete → Stage 4 → admin marks programme complete.

- **Stages only progress when an admin says so.** Booking a session never completes a stage. Payments unlock stages automatically.
- **Programme status** (`INVITED`, `ACCEPTED`, `PHASE_1_PAID`, `PHASE_1_COMPLETE`, `PHASE_2_PAID`, `IN_PROGRESS` = Stage 4 underway, `COMPLETED`, `DECLINED`, `EXPIRED`) is derived from payments and stage completions, separate from the lead's Eligibility Review status.
- **Portal** (`/portal`, login at `/portal/login`): dashboard with the four-stage journey, Application Workspace (Google Drive link), Sessions, Payments (with Stripe receipts), Support (WhatsApp link), Account (change password, sign out). Forgot/reset password included. Sessions are DB-backed and revoked on logout or password reset.
- **Admin applicant page**: Application Strategy panel with invitation, account, payments, stages, Drive link, assignment, revenue split, and only the actions that make sense for the current state. Every step is recorded in the Lifecycle panel.
- **Strategy clients** (`/admin/strategy`): everyone invited or enrolled, with filters (invited, not accepted, Phase 1 unpaid, Stage 1–4, Phase 2 due, completed).
- **View Client Portal** (super admin): read-only preview with a "Viewing as … — Admin Preview" banner; payments, bookings and account changes are refused.
- **Roles** (`/admin/team`): the `ADMIN_PASSWORD` login is the owner (super admin). Add named Admins / Super admins. Admins see only programme clients assigned to them and can't open campaigns, discounts, export, team or previews.
- **Documents** stay in Google Drive. Create one folder per client ("Global Talent Lab — {name}" with 01 Career & Profile · 02 Evidence · 03 Recommendation Letters · 04 Personal Statement · 05 Strategy & Feedback · 06 Final Application), share it only with that client, and paste the link on their record. Clients see it after Phase 1 is paid.
- **Hire a Writer (£250, optional add-on):** offered inside Stage 2 (dashboard, Session 2 page and Payments) from the moment Stage 2 opens until it's completed. Paid via Stripe like the phases; once the webhook confirms it, the client sees "You have purchased writer services too…", gets a confirmation email, and the admin gets a notification plus a reminder on the record to bring the writer to Session 2. It adds to the lead's revenue but isn't part of the £1,899 programme total.
- Payments taken outside Stripe can be recorded on the lead page with product "Phase 1"/"Phase 2"; this unlocks the portal the same way.

**Setup:** run `npx prisma db push` (new tables). In Cal.com create a hidden 60-minute event for programme sessions and set `NEXT_PUBLIC_CAL_STRATEGY_LINK`; the existing Cal.com webhook handles these bookings too. Set `WHATSAPP_BUSINESS_URL` (or `WHATSAPP_BUSINESS_NUMBER`) for the Support page and `ADMIN_NAME` for "Invited by". The existing Stripe webhook covers both phases; nothing new is needed in Stripe.

## Analytics events

Recorded in our own DB (no personal data) and, after cookie consent, sent to GA4 / pixels as generic stage events — never answers, names or contact details:

`landing_page_view` · `assessment_started` · `assessment_step_completed` · `assessment_completed` · `lead_a` / `lead_b` / `lead_c` · `paid_review_clicked` · `checkout_started` · `review_purchased` · `calendar_booking_completed` · `audit_purchased` · `full_service_purchased` · `guidance_opt_in`

**Retargeting audiences** (build in Meta / Google Ads from consented events):
- visited, didn't start → `PageView` minus `AssessmentStarted`
- started, didn't finish → `AssessmentStarted` minus `AssessmentCompleted`
- qualified, didn't buy → `QualifiedLead` minus `Purchase`
- bought £49, not higher → `Purchase` minus `HighTicketPurchase`

## Admin

- **Dashboard**: visitors, starts, completions, A/B/C, paid reviews, audits, full-service, revenue; the conversion rates from the brief; revenue by source; filterable lead table; "needs attention" (paid-not-booked, WhatsApp to send, booked-without-payment).
- **Lead page**: full questionnaire, scoring notes, attribution, lifecycle timestamps with time-to-convert, status changes, notes, payments, message log.
- **Campaigns & influencers**: per source/campaign funnel through to revenue, spend entry for cost-per-qualified-lead / CAC / ROAS, and a campaign link builder.
- **Export CSV**.

Metrics are **cohort-based**: visitors in the date range, and leads created in the range with everything they bought since — so an influencer gets credit for a £1,899 sale that closes weeks later.
