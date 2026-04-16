"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

const CONSENT_KEY = "aitaskflo_clinical_consent_v1";

interface Props {
  children: React.ReactNode;
}

export function ClinicalConsentGate({ children }: Props) {
  const [consented, setConsented] = useState<boolean | null>(null);
  const [checked, setChecked] = useState({ notPhi: false, notClinical: false, notEmergency: false });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      setConsented(stored === "true");
    } catch {
      setConsented(false);
    }
  }, []);

  const allChecked = checked.notPhi && checked.notClinical && checked.notEmergency;

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, "true"); } catch { /* ignore */ }
    setConsented(true);
  }

  // Still loading from localStorage
  if (consented === null) return null;

  // Already consented — render children
  if (consented) return <>{children}</>;

  // Show consent gate
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#0d0d12] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Clinical Features — Required Acknowledgment</h2>
              <p className="text-white/40 text-xs">HIPAA Compliance Notice</p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="px-6 py-4">
          <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/70 leading-relaxed">
              These features are designed for productivity, research, and note drafting. Before continuing, please confirm the following:
            </p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 mb-6">
            {[
              {
                key: "notPhi" as const,
                label: "No real patient PHI without a BAA",
                detail: "I understand that entering real Protected Health Information (PHI) requires a signed Business Associate Agreement with AITaskFlo. I will not enter real patient data until a BAA is in place.",
              },
              {
                key: "notClinical" as const,
                label: "Not for direct clinical decisions",
                detail: "I understand that AI-generated content (SOAP notes, clinical summaries, research) must be independently reviewed by a licensed healthcare professional before any clinical action is taken. This tool is not a medical device.",
              },
              {
                key: "notEmergency" as const,
                label: "Not for emergencies",
                detail: "I understand this tool is not intended for use in emergency or life-threatening situations. In an emergency, contact 911 or appropriate emergency services immediately.",
              },
            ].map(({ key, label, detail }) => (
              <label
                key={key}
                className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {checked[key] ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked[key]}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <div>
                  <p className="text-sm text-white/80 font-medium leading-snug">{label}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{detail}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Links */}
          <div className="flex gap-4 text-xs text-white/30 mb-6">
            <Link href="/baa" target="_blank" className="hover:text-white/60 transition-colors underline underline-offset-2">
              Business Associate Agreement
            </Link>
            <Link href="/hipaa" target="_blank" className="hover:text-white/60 transition-colors underline underline-offset-2">
              HIPAA Privacy Notice
            </Link>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={accept}
              disabled={!allChecked}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-30 bg-emerald-700 hover:bg-emerald-600 text-white disabled:cursor-not-allowed"
            >
              I Acknowledge — Continue
            </button>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
            >
              Go Back
            </Link>
          </div>

          <p className="text-[10px] text-white/20 text-center mt-3">
            This acknowledgment is stored locally and will be requested periodically.
          </p>
        </div>
      </div>
    </div>
  );
}
