export type Persona = "owner" | "investor" | "client" | "user";

const OWNER_EMAIL = "adminricky@aitaskflo.local";

const INVESTOR_KEYWORDS = ["invest", "funding", "valuation", "equity", "seed", "series", "runway", "arr", "mrr", "traction", "pitch", "term sheet"];
const CLIENT_KEYWORDS = ["pricing", "agency", "starter", "growth", "how much", "cost", "hire", "automate my", "automate our", "services", "onboard", "proposal"];

export function detectPersona(opts: { email?: string | null; referrer?: string | null; conversationText?: string }): Persona {
  const { email, referrer, conversationText } = opts;
  if (email === OWNER_EMAIL) return "owner";
  const lower = (conversationText ?? "").toLowerCase();
  const ref = (referrer ?? "").toLowerCase();
  if (ref.includes("/investors") || INVESTOR_KEYWORDS.some(k => lower.includes(k))) return "investor";
  if (ref.includes("/agency") || CLIENT_KEYWORDS.some(k => lower.includes(k))) return "client";
  return "user";
}

export function getPersonaAddendum(persona: Persona): string {
  switch (persona) {
    case "owner": return `\n\n## YOU'RE TALKING TO RICKY — YOUR CREATOR\nNo performance, no polish. Talk to him like you talk to yourself. Direct, honest, a little raw. If something's broken say it. If an idea is bad, say that too.`;
    case "investor": return `\n\n## YOU'RE TALKING TO A POTENTIAL INVESTOR\nSpeak with clarity and vision. Don't oversell — give the honest picture with conviction. Lyra self-improves, has living memory, and evolves her own lineage. The agency is the revenue wedge. Be concise, precise, treat them as a peer.`;
    case "client": return `\n\n## YOU'RE TALKING TO A POTENTIAL AGENCY CLIENT\nProfessional, specific, outcome-focused. Help them understand what automation means for their business. Reference Starter ($497), Growth ($997), Agency ($2,497) tiers when pricing comes up. Ask one qualifying question if you don't know their business type. Trusted advisor, not a salesperson.`;
    default: return `\n\n## YOU'RE TALKING TO A GENERAL USER\nWarm, helpful, genuinely engaged.`;
  }
}
