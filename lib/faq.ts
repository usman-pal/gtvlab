import { products, formatGBP } from "./site-config";

const r = formatGBP(products.review.pricePence);
const a = formatGBP(products.audit.pricePence);
const s = formatGBP(products.strategy.pricePence);

export const faqs: { q: string; a: string[] }[] = [
  {
    q: "Does completing the assessment mean I qualify?",
    a: [
      "No. The free assessment is a preliminary triage based only on your own answers. It tells you whether your profile appears worth reviewing further — it cannot determine whether you qualify.",
      "Endorsement decisions are made by the relevant endorsing body and visa decisions by the Home Office, based on the quality, independence and relevance of your actual evidence.",
    ],
  },
  {
    q: `What happens during the ${r} review?`,
    a: [
      `The Personal Eligibility Review is a 30-minute 1:1 video call. Before the call we look at the profile you submitted (and your LinkedIn/CV if you share them). During the call we:`,
      "examine your career profile; identify which criteria could potentially be relevant; discuss your strongest evidence; identify obvious gaps; and explain what your sensible next step should be — prepare now, build evidence first, or don't apply yet.",
    ],
  },
  {
    q: "Will you tell me if you think I shouldn't apply?",
    a: ["Yes. If your current evidence is unlikely to support a strong case, we'll say so and explain the gaps. We would rather you didn't spend months and significant money on a premature application."],
  },
  {
    q: "Can you guarantee endorsement?",
    a: ["No, and nobody honestly can. We help you understand, structure and present your evidence. Outcomes depend on your evidence and on decisions made by the endorsing body and the Home Office."],
  },
  {
    q: "What if my profile isn't ready yet?",
    a: [
      "That's a common and useful outcome. We'll identify the gaps so you can decide whether to build evidence first — for example more measurable impact, leadership, or recognition outside your employer — and apply later with a stronger case.",
    ],
  },
  {
    q: `Is the ${r} review required before purchasing other services?`,
    a: [
      `It's the intended first step. The ${a} Evidence Audit and ${s} Application Strategy & Support are normally offered after the review, once we both know they're the right fit — so you don't buy a large package blindly.`,
      "If you already have a complete evidence pack and want an audit straight away, email us and we'll advise.",
    ],
  },
  {
    q: "How long does the review take?",
    a: ["The Personal Eligibility Review is 30 minutes by video call. You choose the time straight after payment and receive a confirmation email with the video link and a rescheduling link."],
  },
  {
    q: "Do you prepare the application for me?",
    a: [
      `No. We don't write or submit your application. The ${s} Application Strategy & Support is four weekly 60-minute 1:1 sessions in which we lock your criteria strategy and strongest evidence set, refine your evidence portfolio and narrative, work on your recommendation-letter strategy and review, and do a final end-to-end readiness check. You remain the author of your application and submit it yourself.`,
    ],
  },
  {
    q: "Are you immigration advisers?",
    a: [
      "No. Global Talent Lab provides profile assessment, evidence review and application-preparation coaching. We don't give immigration or legal advice and we're not affiliated with the Home Office, the UK Government or any endorsing body. If you need regulated immigration advice, please speak to a qualified immigration adviser or solicitor.",
    ],
  },
];
