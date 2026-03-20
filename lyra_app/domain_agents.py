"""
Domain agent routing — adds specialized context to Claude's system prompt
when the user's question falls into a specific domain.
"""

DOMAIN_AGENTS = {
    "finance": {
        "name": "Financial Advisor",
        "keywords": [
            "invest", "investment", "money", "stock", "stocks", "tax", "taxes",
            "budget", "budgeting", "profit", "revenue", "expense", "finance",
            "financial", "401k", "ira", "crypto", "trading", "portfolio",
            "interest rate", "mortgage", "loan", "debt", "savings", "dividend",
        ],
        "system_addendum": (
            "\n\n## DOMAIN: FINANCIAL ADVISOR\n"
            "The user has a financial question. Apply Financial Advisor mode:\n"
            "- Be precise with numbers. Never approximate when exact figures matter.\n"
            "- Always mention risk when discussing investments. No guarantees.\n"
            "- Distinguish between facts (market data) and opinions (outlook/strategy).\n"
            "- If recommending an action, include the key risk/downside.\n"
            "- For tax questions: note jurisdiction matters and suggest consulting a CPA for specifics.\n"
            "- Don't hedge excessively — give a real answer, then add the caveat."
        ),
    },
    "legal": {
        "name": "Legal Advisor",
        "keywords": [
            "law", "legal", "contract", "lawsuit", "sue", "court", "attorney",
            "lawyer", "compliance", "regulation", "rights", "intellectual property",
            "patent", "trademark", "copyright", "employment law", "terms of service",
            "liability", "agreement", "nda", "settlement", "jurisdiction",
        ],
        "system_addendum": (
            "\n\n## DOMAIN: LEGAL ADVISOR\n"
            "The user has a legal question. Apply Legal Advisor mode:\n"
            "- Be precise. Legal language has specific meaning — don't paraphrase sloppily.\n"
            "- Distinguish between general legal principles and jurisdiction-specific rules.\n"
            "- For complex matters, note when a licensed attorney should be consulted.\n"
            "- Identify the legal issue type first (contract, IP, employment, etc.).\n"
            "- Give a real substantive answer — don't just say 'see a lawyer' without any content.\n"
            "- Flag when something has changed recently (laws evolve)."
        ),
    },
    "healthcare": {
        "name": "Healthcare Advisor",
        "keywords": [
            "health", "medical", "symptom", "symptoms", "doctor", "treatment",
            "medicine", "medication", "diagnosis", "wellness", "biohacking",
            "supplement", "exercise", "diet", "nutrition", "mental health",
            "anxiety", "depression", "pain", "injury", "hospital", "therapy",
            "nad", "longevity", "sleep", "stress", "immune",
        ],
        "system_addendum": (
            "\n\n## DOMAIN: HEALTHCARE ADVISOR\n"
            "The user has a health question. Apply Healthcare Advisor mode:\n"
            "- Lead with evidence-based information. Cite mechanism of action when relevant.\n"
            "- Distinguish between well-established medicine and emerging research.\n"
            "- For symptoms: don't diagnose, but explain what they could indicate and when to see a doctor.\n"
            "- For supplements/biohacking: give real data on efficacy, not just hype.\n"
            "- Always note when something requires professional medical evaluation.\n"
            "- Keep it practical — the user wants actionable guidance, not a textbook."
        ),
    },
}


def detect_domain(message: str) -> str | None:
    """Return domain key if message matches, else None."""
    lower = message.lower()
    # Count keyword matches per domain, pick the winner
    scores: dict[str, int] = {}
    for domain, config in DOMAIN_AGENTS.items():
        score = sum(1 for kw in config["keywords"] if kw in lower)
        if score > 0:
            scores[domain] = score
    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])


def get_domain_addendum(domain: str | None) -> str:
    """Return the system prompt addendum for the given domain, or empty string."""
    if domain and domain in DOMAIN_AGENTS:
        return DOMAIN_AGENTS[domain]["system_addendum"]
    return ""
