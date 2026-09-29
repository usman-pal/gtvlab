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
