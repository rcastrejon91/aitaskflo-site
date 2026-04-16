import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Shield, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "HIPAA Notice of Privacy Practices | AITaskFlo",
  description: "AITaskFlo HIPAA Notice of Privacy Practices — how we use and protect your Protected Health Information.",
};

const EFFECTIVE_DATE = "April 15, 2026";
const CONTACT_EMAIL = "aitaskflo@gmail.com";
const COMPANY = "AITaskFlo";

export default function HipaaPage() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#080810" }}>
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ background: "rgba(8,8,16,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">{COMPANY}</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Notice of Privacy Practices</h1>
            <p className="text-white/35 text-sm">Effective: {EFFECTIVE_DATE} · 45 CFR § 164.520</p>
          </div>
        </div>

        {/* Important notice banner */}
        <div className="mb-10 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-sm font-semibold text-emerald-300 mb-1">THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.</p>
          <p className="text-xs text-white/50 mt-2">As required by 45 CFR § 164.520, this Notice of Privacy Practices describes {COMPANY}&apos;s legal duties and privacy practices with respect to Protected Health Information (PHI) when we act as a Business Associate on behalf of a Covered Entity, or as a Covered Entity ourselves.</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Our Duties</h2>
            <p className="mb-3">{COMPANY} is required by law to:</p>
            <ul className="space-y-2 list-disc list-inside marker:text-white/20">
              <li>Maintain the privacy of your PHI.</li>
              <li>Provide you with notice of our legal duties and privacy practices.</li>
              <li>Follow the terms of the Notice currently in effect.</li>
              <li>Notify affected individuals following a breach of unsecured PHI.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. How We May Use and Disclose PHI</h2>
            <p className="mb-4">The following describes the ways {COMPANY} may use and disclose PHI. Not every use or disclosure in a category will be listed, but all the ways we are permitted to use and disclose information will fall within one of the categories.</p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-white/80 font-medium mb-1">Treatment</p>
                <p>We may use and disclose PHI for your treatment and to provide you with treatment-related health care services, including sharing information with other healthcare providers involved in your care, when authorized by you or your covered entity.</p>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-white/80 font-medium mb-1">Health Care Operations</p>
                <p>We may use and disclose PHI for health care operations, including quality assessment, training, customer service, and business management activities necessary to run the service and improve care delivery.</p>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-white/80 font-medium mb-1">As Required by Law</p>
                <p>We will disclose PHI when required to do so by federal, state, or local law, including to the Department of Health and Human Services for compliance investigations.</p>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-white/80 font-medium mb-1">Business Associates</p>
                <p>We may disclose PHI to our business associates (subcontractors and vendors) who provide services on our behalf, provided they have signed a Business Associate Agreement committing to protect PHI.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. Uses and Disclosures Requiring Your Authorization</h2>
            <p>
              Other uses and disclosures of PHI not covered by this Notice will be made only with your written authorization. You may revoke an authorization in writing at any time, except to the extent that we have already taken action in reliance on the authorization. To provide authorization or revoke one, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-400 hover:text-blue-300">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. Your Rights Regarding Your PHI</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Right to Access",
                  body: "You have the right to inspect and copy your PHI that we maintain in a Designated Record Set. To request access, submit a written request to our Privacy Officer. We will respond within 30 days.",
                },
                {
                  title: "Right to Amend",
                  body: "If you believe PHI we have about you is incorrect or incomplete, you may ask us to amend the information. Submit an amendment request in writing to our Privacy Officer. We may deny the request in certain circumstances.",
                },
                {
                  title: "Right to an Accounting of Disclosures",
                  body: "You have the right to request a list of the disclosures we have made of your PHI. The accounting covers disclosures made in the six years prior to the date of your request. We will respond within 60 days.",
                },
                {
                  title: "Right to Request Restrictions",
                  body: "You have the right to request a restriction or limitation on the PHI we use or disclose. We are not required to agree to your request, but if we do, we will comply with it unless the information is needed for emergency treatment.",
                },
                {
                  title: "Right to Request Confidential Communications",
                  body: "You have the right to request that we communicate with you about PHI in a certain way or at a certain location. We will accommodate reasonable requests.",
                },
                {
                  title: "Right to a Paper Copy of This Notice",
                  body: "You have the right to a paper copy of this notice at any time by emailing our Privacy Officer.",
                },
              ].map(({ title, body }) => (
                <div key={title} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <p className="text-white/80 font-medium mb-1">{title}</p>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. Technical Safeguards We Maintain</h2>
            <p className="mb-4">Per HIPAA Security Rule (45 CFR Part 164 Subpart C), {COMPANY} implements the following:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Encryption at Rest", detail: "AES-256-GCM on all PHI fields" },
                { label: "Encryption in Transit", detail: "TLS 1.2+ enforced via Cloudflare" },
                { label: "Audit Logging", detail: "Every PHI access logged with identity, time, IP" },
                { label: "Access Controls", detail: "Authentication required; no anonymous PHI access" },
                { label: "Session Timeout", detail: "Automatic timeout on clinical sessions" },
                { label: "Unique User IDs", detail: "No shared accounts for PHI access" },
                { label: "Breach Detection", detail: "Security monitoring and incident response plan" },
                { label: "Workforce Training", detail: "Annual HIPAA training for all staff with PHI access" },
              ].map(({ label, detail }) => (
                <div key={label} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <p className="text-white/70 font-medium text-xs mb-0.5">{label}</p>
                  <p className="text-xs text-white/40">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Breach Notification</h2>
            <p>
              In the event of a breach of unsecured PHI, {COMPANY} will notify affected individuals and, where applicable, the relevant Covered Entity and the Secretary of HHS, in accordance with 45 CFR §§ 164.400–414. Individual notice will be provided without unreasonable delay and in no case later than <span className="text-white/80">60 calendar days</span> after discovery of the breach. Notice will be provided by first-class mail or email (where consent has been obtained).
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Complaints</h2>
            <p className="mb-3">
              If you believe your privacy rights have been violated, you may file a complaint with us or with the Secretary of the U.S. Department of Health and Human Services. To file a complaint with us, contact our Privacy Officer. We will not retaliate against you for filing a complaint.
            </p>
            <p>
              To file a complaint with HHS, visit:{" "}
              <a href="https://www.hhs.gov/hipaa/filing-a-complaint" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                hhs.gov/hipaa/filing-a-complaint
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Changes to This Notice</h2>
            <p>
              We reserve the right to change this Notice and to make the revised Notice effective for PHI we already have about you as well as any information we receive in the future. We will post a copy of the current Notice on our website. The Notice will contain on the first page, in the top right-hand corner, the effective date.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Privacy and Security Officer Contact</h2>
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-1.5">
              <p className="text-white/70"><span className="text-white/40">Organization:</span> {COMPANY}</p>
              <p className="text-white/70"><span className="text-white/40">Privacy &amp; Security Officer:</span> {COMPANY} Team</p>
              <p className="text-white/70"><span className="text-white/40">Email:</span> <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-400 hover:text-blue-300">{CONTACT_EMAIL}</a></p>
              <p className="text-xs text-white/30 mt-2">For PHI requests, complaints, BAA inquiries, or breach reports.</p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=HIPAA Privacy Request`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Privacy Officer
          </a>
          <Link
            href="/baa"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold transition-colors"
          >
            Business Associate Agreement
          </Link>
        </div>

        <p className="mt-8 text-xs text-white/20">
          This Notice is provided in accordance with 45 CFR § 164.520. Last reviewed: {EFFECTIVE_DATE}.
        </p>
      </div>
    </div>
  );
}
