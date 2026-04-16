import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, FileText, Mail, Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Business Associate Agreement | AITaskFlo",
  description: "AITaskFlo Business Associate Agreement (BAA) for HIPAA-covered entities and their business associates.",
};

const EFFECTIVE_DATE = "April 15, 2026";
const CONTACT_EMAIL = "aitaskflo@gmail.com";
const COMPANY = "AITaskFlo";

export default function BaaPage() {
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
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Business Associate Agreement</h1>
            <p className="text-white/35 text-sm">Effective: {EFFECTIVE_DATE} · HIPAA § 164.308(b), § 164.502(e)</p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mb-10 p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-300 mb-0.5">Need to execute a BAA?</p>
            <p className="text-xs text-white/50">Email us to request a countersigned copy. We respond within 2 business days.</p>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=BAA Request — ${COMPANY}&body=Hello,%0D%0A%0D%0AI am a covered entity / business associate and would like to execute a BAA with ${COMPANY}.%0D%0A%0D%0AOrganization name:%0D%0AContact name:%0D%0AContact title:%0D%0A`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shrink-0"
          >
            <Mail className="w-4 h-4" />
            Request BAA
          </a>
        </div>

        {/* Agreement text */}
        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Recitals</h2>
            <p>
              This Business Associate Agreement (&ldquo;BAA&rdquo;) is entered into between {COMPANY} (&ldquo;Business Associate&rdquo;) and the Covered Entity or Business Associate identified in the applicable order form or service agreement (&ldquo;Covered Entity&rdquo;). This BAA supplements and is incorporated into the {COMPANY} Terms of Service. In the event of a conflict between this BAA and the Terms of Service, this BAA controls with respect to Protected Health Information.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Definitions</h2>
            <p className="mb-3">
              Terms used but not otherwise defined in this BAA have the meanings assigned under HIPAA, including the HIPAA Rules (45 CFR Parts 160 and 164).
            </p>
            <ul className="space-y-2 list-disc list-inside marker:text-white/20">
              <li><span className="text-white/70 font-medium">Protected Health Information (PHI)</span> — health information that identifies or could identify an individual, transmitted or maintained in any form, as defined in 45 CFR § 164.103.</li>
              <li><span className="text-white/70 font-medium">Electronic PHI (ePHI)</span> — PHI maintained or transmitted in electronic form.</li>
              <li><span className="text-white/70 font-medium">HIPAA Rules</span> — the Privacy, Security, Breach Notification, and Enforcement Rules at 45 CFR Parts 160 and 164.</li>
              <li><span className="text-white/70 font-medium">Security Incident</span> — the attempted or successful unauthorized access, use, disclosure, modification, or destruction of information or interference with system operations in an information system.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. Obligations of Business Associate</h2>
            <p className="mb-3">{COMPANY} agrees to:</p>
            <ul className="space-y-2 list-disc list-inside marker:text-white/20">
              <li>Not use or disclose PHI other than as permitted or required by this BAA or as required by law.</li>
              <li>Use appropriate safeguards and comply with Subpart C of 45 CFR Part 164 with respect to ePHI, to prevent use or disclosure of PHI other than as provided for by this BAA.</li>
              <li>Report to Covered Entity any use or disclosure of PHI not provided for by this BAA of which {COMPANY} becomes aware, including breaches of unsecured PHI as required by 45 CFR § 164.410, and any Security Incident of which it becomes aware.</li>
              <li>Ensure that any subcontractors that create, receive, maintain, or transmit PHI on behalf of {COMPANY} agree to the same restrictions, conditions, and requirements that apply to {COMPANY}.</li>
              <li>Make available PHI in a Designated Record Set to Covered Entity as necessary to satisfy Covered Entity&apos;s obligations under 45 CFR § 164.524.</li>
              <li>Make its internal practices, books, and records relating to the use and disclosure of PHI available to the Secretary of HHS for the purpose of determining compliance with the HIPAA Rules.</li>
              <li>Upon termination of this BAA, return or destroy all PHI received from or created on behalf of Covered Entity, if feasible.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. Permitted Uses and Disclosures</h2>
            <p className="mb-3">{COMPANY} may use or disclose PHI only as follows:</p>
            <ul className="space-y-2 list-disc list-inside marker:text-white/20">
              <li>As necessary to perform the services described in the applicable service agreement with Covered Entity.</li>
              <li>As required by law.</li>
              <li>For the proper management and administration of {COMPANY} or to carry out its legal responsibilities, provided that disclosures are required by law or {COMPANY} obtains reasonable assurances that the information will remain confidential and will be used or disclosed only as required by law or for the purpose for which it was disclosed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. Technical Safeguards</h2>
            <p className="mb-3">{COMPANY} implements the following technical safeguards for ePHI:</p>
            <ul className="space-y-2 list-disc list-inside marker:text-white/20">
              <li><span className="text-white/70 font-medium">Encryption at rest:</span> All PHI fields are encrypted using AES-256-GCM before storage.</li>
              <li><span className="text-white/70 font-medium">Encryption in transit:</span> All data is transmitted over TLS 1.2 or higher (enforced via Cloudflare).</li>
              <li><span className="text-white/70 font-medium">Audit logging:</span> Every access, modification, and deletion of PHI is logged with timestamp, user identity, and IP address, per 45 CFR § 164.312(b).</li>
              <li><span className="text-white/70 font-medium">Access controls:</span> PHI access requires authenticated sessions. Anonymous access is blocked at the application layer.</li>
              <li><span className="text-white/70 font-medium">Automatic session timeout:</span> Clinical sessions expire after periods of inactivity.</li>
              <li><span className="text-white/70 font-medium">Unique user identification:</span> Each user is assigned a unique identifier; shared accounts are prohibited for PHI access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Breach Notification</h2>
            <p>
              In the event of a Breach of Unsecured PHI affecting Covered Entity&apos;s data, {COMPANY} will notify Covered Entity without unreasonable delay and in no case later than <span className="text-white/80">60 calendar days</span> after discovery of the breach, as required by 45 CFR § 164.410. The notification will include, to the extent possible: the identification of each individual whose PHI has been or may have been breached; a description of the breach; the types of PHI involved; steps the individual should take; a description of what {COMPANY} is doing to investigate, mitigate, and prevent future breaches; and contact information for further questions.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Obligations of Covered Entity</h2>
            <p className="mb-3">Covered Entity agrees to:</p>
            <ul className="space-y-2 list-disc list-inside marker:text-white/20">
              <li>Notify {COMPANY} of any limitations in Covered Entity&apos;s Notice of Privacy Practices that may affect {COMPANY}&apos;s use or disclosure of PHI.</li>
              <li>Notify {COMPANY} of any changes in, or revocation of, the permission by an individual to use or disclose their PHI.</li>
              <li>Not request that {COMPANY} use or disclose PHI in any manner that would not be permissible under the HIPAA Rules.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Term and Termination</h2>
            <p className="mb-3">
              This BAA is effective as of the date the parties execute the applicable service agreement and shall terminate when {COMPANY} no longer provides services to Covered Entity or upon mutual written agreement.
            </p>
            <p>
              Either party may terminate this BAA and the underlying service agreement if the other party materially breaches this BAA and fails to cure such breach within 30 days of written notice. Upon termination, {COMPANY} will return or destroy all PHI, or if return or destruction is infeasible, will extend protections indefinitely and limit further use to those purposes that make the return or destruction infeasible.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Miscellaneous</h2>
            <ul className="space-y-2 list-disc list-inside marker:text-white/20">
              <li><span className="text-white/70 font-medium">Amendment:</span> The parties agree to amend this BAA as necessary to comply with changes in applicable law.</li>
              <li><span className="text-white/70 font-medium">Interpretation:</span> Any ambiguity shall be resolved in favor of a meaning that permits compliance with HIPAA Rules.</li>
              <li><span className="text-white/70 font-medium">Governing Law:</span> This BAA is governed by the laws of the State of Illinois, United States, and applicable federal law including HIPAA.</li>
              <li><span className="text-white/70 font-medium">Entire Agreement:</span> This BAA, together with the applicable service agreement, constitutes the entire agreement between the parties regarding the subject matter herein.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Contact — Security & Privacy Officer</h2>
            <p>
              For questions about this BAA, PHI requests, or to report a security incident, contact the {COMPANY} Security and Privacy Officer:
            </p>
            <div className="mt-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-1">
              <p className="text-white/70"><span className="text-white/40">Organization:</span> {COMPANY}</p>
              <p className="text-white/70"><span className="text-white/40">Role:</span> Security &amp; Privacy Officer</p>
              <p className="text-white/70"><span className="text-white/40">Email:</span> <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-400 hover:text-blue-300">{CONTACT_EMAIL}</a></p>
              <p className="text-white/70"><span className="text-white/40">Response time:</span> 2 business days for routine inquiries; immediate escalation for breach reports</p>
            </div>
          </section>

        </div>

        {/* Footer actions */}
        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=BAA Request — ${COMPANY}&body=Hello,%0D%0A%0D%0AI am requesting execution of a BAA with ${COMPANY}.%0D%0A%0D%0AOrganization name:%0D%0AContact name:%0D%0AContact title:%0D%0A`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            <Mail className="w-4 h-4" />
            Request Signed BAA
          </a>
          <Link
            href="/hipaa"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold transition-colors"
          >
            <FileText className="w-4 h-4" />
            HIPAA Privacy Notice
          </Link>
        </div>

        <p className="mt-8 text-xs text-white/20">
          This BAA is based on the HHS model Business Associate Agreement. For questions about HIPAA compliance, consult qualified legal counsel.
        </p>
      </div>
    </div>
  );
}
