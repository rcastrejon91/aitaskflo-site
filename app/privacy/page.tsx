import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AITaskFlo collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  const updated = "April 4, 2026";
  return (
    <div className="min-h-screen text-white" style={{ background: "#080810" }}>
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ background: "rgba(8,8,16,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">AITaskFlo</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/35 text-sm mb-12">Last updated: {updated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8" style={{ color: "rgba(255,255,255,0.55)" }}>
          {[
            {
              title: "1. Information We Collect",
              body: `We collect information you provide directly: your email address and password when you register, your name (optional), and the messages you send to Lyra. We also collect usage data such as message counts and subscription status to operate and improve the service.`,
            },
            {
              title: "2. How We Use Your Information",
              body: `We use your information to provide and operate the Lyra AI service, process payments via Stripe, respond to support requests, and improve our models and product. We do not sell your personal data to third parties.`,
            },
            {
              title: "3. Data Storage",
              body: `Your account data and conversation history are stored in a secure SQLite database on our servers. Passwords are hashed using bcrypt and are never stored in plain text. AI conversation content is not used to train shared models — your memory stays private to your account.`,
            },
            {
              title: "4. Payments",
              body: `Payment processing is handled by Stripe. We never store your credit card details on our servers. Stripe's privacy policy governs how your payment information is handled.`,
            },
            {
              title: "5. Cookies",
              body: `We use session cookies to keep you signed in. We do not use third-party tracking cookies or advertising cookies.`,
            },
            {
              title: "6. Data Retention",
              body: `We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by emailing support@aitaskflo.com.`,
            },
            {
              title: "7. Security",
              body: `We use industry-standard security practices including HTTPS, hashed passwords, and server-side validation. No system is 100% secure; we encourage strong unique passwords.`,
            },
            {
              title: "8. Your Rights",
              body: `You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at support@aitaskflo.com. EU/EEA residents have additional rights under GDPR.`,
            },
            {
              title: "9. Changes to This Policy",
              body: `We may update this policy. We will notify you of significant changes via email or a notice in the app. Continued use after changes constitutes acceptance.`,
            },
            {
              title: "10. Contact",
              body: `Questions? Email us at support@aitaskflo.com.`,
            },
          ].map(({ title, body }) => (
            <section key={title}>
              <h2 className="text-white font-semibold text-base mb-2">{title}</h2>
              <p className="leading-relaxed">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
