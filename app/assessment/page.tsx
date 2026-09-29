import type { Metadata } from "next";
import { Header } from "@/components/SiteChrome";
import AssessmentForm from "./AssessmentForm";

export const metadata: Metadata = {
  title: "Free Global Talent profile check",
  description: "Free 3-minute preliminary assessment for digital technology professionals considering the UK Global Talent route.",
};

export default function AssessmentPage() {
  return (
    <>
      <Header minimal />
      <main className="assess-wrap">
        <AssessmentForm />
      </main>
    </>
  );
}
