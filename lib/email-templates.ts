import { site, formatGBP, products } from "./site-config";

export type TemplateLead = {
  name: string;
  token: string;
  grade: string;
  strengths: string[];
  bookingStart?: Date | null;
  bookingTimezone?: string | null;
  meetingUrl?: string | null;
  rescheduleUrl?: string | null;
  cancelUrl?: string | null;
};

export type Rendered = { subject: string; html: string; text: string };

const first = (name: string) => (name || "there").trim().split(/\s+/)[0];
const url = (path: string) => `${site.url}${path}`;
export const resultUrl = (token: string) => url(`/assessment/result/${token}`);
export const reviewUrl = (token: string) => url(`/assessment/result/${token}#review`);
export const bookUrl = (token: string) => url(`/book/${token}`);

type Block = { p?: string; h?: string; list?: string[]; cta?: { label: string; href: string }; small?: string };

function layout(blocks: Block[], unsubscribeHref?: string): { html: string; text: string } {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = blocks
    .map((b) => {
      if (b.h) return `<h2 style="font-size:18px;margin:24px 0 8px;color:#0B1F3A">${esc(b.h)}</h2>`;
      if (b.p) return `<p style="margin:0 0 14px;line-height:1.6">${esc(b.p)}</p>`;
      if (b.list) return `<ul style="margin:0 0 14px;padding-left:20px;line-height:1.6">${b.list.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
      if (b.cta)
        return `<p style="margin:22px 0"><a href="${b.cta.href}" style="background:#0F766E;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${esc(b.cta.label)}</a></p>`;
      if (b.small) return `<p style="margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.5">${esc(b.small)}</p>`;
      return "";
    })
    .join("\n");
  const footer = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 14px"/>
<p style="font-size:12px;color:#64748b;line-height:1.5">${esc(site.scopeNote)}</p>
${unsubscribeHref ? `<p style="font-size:12px;color:#64748b">Don't want these emails? <a href="${unsubscribeHref}" style="color:#64748b">Unsubscribe</a>.</p>` : ""}`;
  const wrapped = `<!doctype html><html><body style="margin:0;background:#f8fafc"><div style="max-width:560px;margin:0 auto;padding:28px 22px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;font-size:15px;background:#fff">
<p style="font-weight:700;color:#0B1F3A;margin:0 0 20px">Global Talent Lab</p>${html}${footer}</div></body></html>`;
  const text =
    blocks
      .map((b) => b.h ?? b.p ?? b.small ?? (b.list ? b.list.map((i) => `- ${i}`).join("\n") : b.cta ? `${b.cta.label}: ${b.cta.href}` : ""))
      .join("\n\n") + `\n\n—\n${site.scopeNote}${unsubscribeHref ? `\nUnsubscribe: ${unsubscribeHref}` : ""}`;
  return { html: wrapped, text };
}

const reviewPrice = formatGBP(products.review.pricePence);

/** Renders a template. `unsub` is the unsubscribe URL (required for marketing emails). */
export function renderTemplate(key: string, lead: TemplateLead, unsub?: string): Rendered | null {
  const hi = { p: `Hi ${first(lead.name)},` };
  const sales = lead.grade === "A" || lead.grade === "B";
  const reviewCta = { cta: { label: `Book my ${reviewPrice} review`, href: reviewUrl(lead.token) } };
  const softCta = sales
    ? reviewCta
    : { cta: { label: "Retake the profile check later", href: url("/assessment") } };
  const strengthsLine = lead.strengths.length ? lead.strengths.slice(0, 3).join(", ").toLowerCase() : "";

  const T: Record<string, () => { subject: string; blocks: Block[]; marketing: boolean }> = {
    result_ab: () => ({
      subject: lead.grade === "A" ? "Your Global Talent profile check: worth reviewing in detail" : "Your Global Talent profile check: some areas to examine",
      marketing: false,
      blocks: [
        hi,
        {
          p:
            lead.grade === "A"
              ? "Thanks for completing the Global Talent Lab profile check. Based on your answers, your profile contains several indicators that may be relevant to a UK Global Talent application."
              : "Thanks for completing the Global Talent Lab profile check. Your profile shows some relevant characteristics, but there are areas that need closer examination.",
        },
        ...(strengthsLine ? [{ p: `Indicators we noticed: ${strengthsLine}.` }] : []),
        { p: "The questionnaire cannot determine whether you qualify. What matters is the quality, independence and relevance of your actual evidence — that is what the Personal Eligibility Review looks at." },
        { h: `Personal Eligibility Review — ${reviewPrice}` },
        { list: products.review.deliverables },
        reviewCta,
        { p: `You can see your result again at any time: ${resultUrl(lead.token)}` },
      ],
    }),
    guide_welcome: () => ({
      subject: "Your Global Talent guidance",
      marketing: true,
      blocks: [
        hi,
        { p: "Thanks for asking for guidance. Over the next few weeks we'll send a handful of short, practical emails about how Global Talent evidence is assessed — no sales pressure." },
        { h: "Where to start" },
        {
          p: "Profiles generally become easier to assess when there is stronger evidence of measurable professional impact, leadership, innovation or recognition beyond normal job responsibilities.",
        },
        {
          list: [
            "Write down 3–5 outcomes you personally drove, with numbers (users, revenue, cost, performance, adoption).",
            "Look for recognition that comes from outside your employer: talks, publications, awards, judging, open-source adoption, media.",
            "Keep evidence independent and verifiable — letters and links from others carry more weight than self-description.",
          ],
        },
        { p: "When your evidence has developed, you're welcome to retake the profile check." },
        softCta,
      ],
    }),
    nurture_d2: () => ({
      subject: "The Global Talent evidence mistake we see most often",
      marketing: true,
      blocks: [
        hi,
        { p: "The most common mistake we see is describing your job instead of your impact." },
        { p: "Job descriptions, lists of responsibilities and technologies used tell an assessor what you were paid to do. They don't show what changed because of you, or why that matters beyond your employer." },
        { h: "What to do instead" },
        {
          list: [
            "Lead with the outcome: what changed, for whom, and by how much.",
            "Show your specific role — what you decided, designed or led, not just what the team did.",
            "Back it up with independent evidence: metrics, product pages, press, letters from people who saw the impact.",
          ],
        },
        ...(sales ? [{ p: "In the Personal Eligibility Review we look at your strongest achievements and discuss how they could be evidenced." }] : []),
        softCta,
      ],
    }),
    nurture_d5: () => ({
      subject: "What counts as evidence of impact?",
      marketing: true,
      blocks: [
        hi,
        { p: "\"Impact\" is the word everyone uses and few people evidence well. A few examples of the kind of evidence that tends to be easier to assess:" },
        {
          list: [
            "A product or system you led, with adoption or commercial numbers that can be verified.",
            "Measurable improvements you drove: revenue, cost, performance, reliability, users.",
            "Work adopted beyond your employer: open-source usage, standards, widely used tools.",
            "Recognition from others in the field: invited talks, awards, judging, publications, press.",
          ],
        },
        { p: "Weak evidence usually looks like: internal praise without specifics, team achievements with no clear personal role, or claims that can't be verified." },
        softCta,
      ],
    }),
    nurture_d9: () => ({
      subject: "What a potential Global Talent profile can look like",
      marketing: true,
      blocks: [
        hi,
        { p: "An illustrative example (not a real client, and not an eligibility decision):" },
        { h: "Senior ML Engineer, 8 years" },
        { list: ["Strength: shipped models that materially changed a core product metric", "Strength: led a small team and the technical roadmap", "Gap: little recognition outside their employer"] },
        { p: "A profile like this is often worth a detailed look — the question is whether the impact can be evidenced independently, and whether the recognition gap can be addressed now or needs time." },
        ...(sales ? [{ p: "That's exactly the kind of question the Personal Eligibility Review is designed to answer for your profile." }] : []),
        softCta,
      ],
    }),
    nurture_d14: () => ({
      subject: "Still considering Global Talent?",
      marketing: true,
      blocks: [
        hi,
        { p: "Still considering Global Talent? Your profile review is available here whenever you're ready." },
        { p: "In 30 minutes we'll look at your career profile, discuss your strongest evidence and give you an honest view of your sensible next step — including if that step is to wait." },
        reviewCta,
      ],
    }),
    nurture_d21: () => ({
      subject: "When we would advise someone NOT to apply",
      marketing: true,
      blocks: [
        hi,
        { p: "Not every technology professional should apply immediately. We would advise waiting when, for example:" },
        {
          list: [
            "Most of the evidence describes responsibilities rather than outcomes.",
            "There is no recognition beyond the current employer yet.",
            "The strongest achievements can't be independently evidenced.",
            "Referees who know the work well aren't available.",
          ],
        },
        { p: "In those cases we'd rather explain the gaps than encourage you to spend significant time and money on an application prematurely." },
        softCta,
      ],
    }),
    nurture_d30: () => ({
      subject: "One last note from Global Talent Lab",
      marketing: true,
      blocks: [
        hi,
        { p: "This is our last scheduled email about your profile check. If the timing isn't right, that's completely fine." },
        { p: "If you'd like a personal view of your evidence in the future, your review page stays available." },
        softCta,
      ],
    }),
    review_paid: () => ({
      subject: "Payment received — choose your review time",
      marketing: false,
      blocks: [
        hi,
        { p: `Thanks — your ${products.review.name} (${reviewPrice}) is confirmed.` },
        { p: "If you haven't chosen a time yet, you can pick a slot here:" },
        { cta: { label: "Choose my appointment", href: bookUrl(lead.token) } },
      ],
    }),
    book_reminder: () => ({
      subject: "Don't forget to choose your review time",
      marketing: false,
      blocks: [hi, { p: "You've paid for your Personal Eligibility Review but haven't picked a time yet." }, { cta: { label: "Choose my appointment", href: bookUrl(lead.token) } }],
    }),
    booking_confirmed: () => {
      const when = lead.bookingStart
        ? lead.bookingStart.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: lead.bookingTimezone || "Europe/London" })
        : "your chosen time";
      return {
        subject: `Confirmed: Personal Eligibility Review — ${when}`,
        marketing: false,
        blocks: [
          hi,
          { p: "Your Personal Eligibility Review is booked." },
          {
            list: [
              `When: ${when} (${lead.bookingTimezone || "Europe/London"})`,
              `Video call: ${lead.meetingUrl || "the link is in your calendar invitation"}`,
              ...(lead.rescheduleUrl ? [`Reschedule: ${lead.rescheduleUrl}`] : []),
              ...(lead.cancelUrl ? [`Cancel: ${lead.cancelUrl}`] : []),
            ],
          },
          { h: "How to prepare (15 minutes)" },
          {
            list: [
              "Reply to this email with your LinkedIn profile and CV (if you haven't shared them).",
              "List your 3 strongest achievements, with numbers where possible.",
              "Gather links to any external evidence: talks, publications, open-source, awards, press.",
              "Note the questions you most want answered.",
            ],
          },
          { small: "The review is a coaching session about your profile and evidence. It is not immigration or legal advice and does not guarantee endorsement." },
        ],
      };
    },
    purchase_confirmed: () => ({
      subject: "Payment received — next steps",
      marketing: false,
      blocks: [hi, { p: "Thanks for your payment. We'll be in touch within one working day to schedule your sessions and explain what to send beforehand." }],
    }),
  };

  const t = T[key];
  if (!t) return null;
  const { subject, blocks, marketing } = t();
  const { html, text } = layout(blocks, marketing ? unsub : undefined);
  return { subject, html, text };
}

/** Personalised WhatsApp text (used for the wa.me fallback and as the template's parameters). */
export function whatsappText(key: string, lead: TemplateLead, strength: string): string {
  if (key === "wa_followup")
    return `Hi ${first(lead.name)}, just a quick follow-up from Global Talent Lab. If you'd like a personal view of your Global Talent evidence, your £49 review can be booked here: ${reviewUrl(lead.token)}\n\n(Reply STOP and we won't message you again.)`;
  return `Hi ${first(lead.name)},\n\nThanks for completing the Global Talent Lab profile assessment.\n\nBased on your initial information, your background appears worth examining further, particularly your ${strength}.\n\nThe next step is a Personal Eligibility Review where we examine your career evidence in more detail.\n\nYou can book the £49 review here:\n${reviewUrl(lead.token)}`;
}
