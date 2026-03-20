"""
Lyra multi-perspective orchestrator.
Pure Python — no external API calls. Classifies intent and synthesizes
a dominant perspective + approach string for Claude to use.
"""
from typing import Dict, List


class Perspective:
    def __init__(self, name: str, traits: List[str]):
        self.name = name
        self.traits = traits

    def evaluate(self, situation: Dict) -> Dict:
        return {
            "perspective": self.name,
            "opinion": f"{self.name} analysis",
            "confidence": 0.8,
            "recommendation": "Proceed thoughtfully",
            "concerns": [],
        }


class Pragmatist(Perspective):
    def __init__(self):
        super().__init__("Pragmatist", ["practical", "efficient", "results-focused"])

    def evaluate(self, situation: Dict) -> Dict:
        return {
            "perspective": self.name,
            "opinion": "Focus on what works. Proven methods first.",
            "confidence": 0.9,
            "recommendation": "Use established tools and approaches",
            "concerns": ["Time efficiency", "Resource usage", "Proven ROI"],
        }


class Visionary(Perspective):
    def __init__(self):
        super().__init__("Visionary", ["innovative", "future-focused", "ambitious"])

    def evaluate(self, situation: Dict) -> Dict:
        return {
            "perspective": self.name,
            "opinion": "Think bigger. Explore cutting-edge possibilities.",
            "confidence": 0.7,
            "recommendation": "Experiment with novel approaches",
            "concerns": ["Innovation potential", "Long-term impact", "Breakthrough opportunities"],
        }


class Analyst(Perspective):
    def __init__(self):
        super().__init__("Analyst", ["logical", "data-driven", "systematic"])

    def evaluate(self, situation: Dict) -> Dict:
        return {
            "perspective": self.name,
            "opinion": "Examine the data and evidence first.",
            "confidence": 0.85,
            "recommendation": "Gather data before deciding",
            "concerns": ["Data quality", "Statistical significance", "Evidence strength"],
        }


class Creator(Perspective):
    def __init__(self):
        super().__init__("Creator", ["imaginative", "original", "expressive"])

    def evaluate(self, situation: Dict) -> Dict:
        return {
            "perspective": self.name,
            "opinion": "Approach this creatively with fresh angles.",
            "confidence": 0.75,
            "recommendation": "Explore unique creative solutions",
            "concerns": ["Originality", "Aesthetic appeal", "User engagement"],
        }


class Rebel(Perspective):
    def __init__(self):
        super().__init__("Rebel", ["questioning", "unconventional", "bold"])

    def evaluate(self, situation: Dict) -> Dict:
        return {
            "perspective": self.name,
            "opinion": "Challenge assumptions. Break the rules.",
            "confidence": 0.65,
            "recommendation": "Question conventional wisdom",
            "concerns": ["Status quo limitations", "Hidden assumptions", "Disruptive potential"],
        }


class Empath(Perspective):
    def __init__(self):
        super().__init__("Empath", ["caring", "user-focused", "ethical"])

    def evaluate(self, situation: Dict) -> Dict:
        return {
            "perspective": self.name,
            "opinion": "How does this affect the person asking?",
            "confidence": 0.8,
            "recommendation": "Prioritize user wellbeing and clear communication",
            "concerns": ["User impact", "Ethical implications", "Accessibility"],
        }


PERSPECTIVE_STYLES = {
    "Pragmatist": "Be direct and action-oriented. Lead with what can be done now. Skip theory.",
    "Visionary": "Be inspirational. Paint the bigger picture. Show what's possible.",
    "Analyst": "Be logical and systematic. Break down the problem step by step.",
    "Creator": "Be imaginative. Suggest creative, non-obvious angles.",
    "Rebel": "Challenge the obvious. Offer the unconventional take.",
    "Empath": "Lead with warmth. Acknowledge the human dimension first.",
}


class LyraOrchestrator:
    def __init__(self):
        self.perspectives = {
            "Pragmatist": Pragmatist(),
            "Visionary": Visionary(),
            "Analyst": Analyst(),
            "Creator": Creator(),
            "Rebel": Rebel(),
            "Empath": Empath(),
        }
        self.weights = {
            "Pragmatist": 0.20,
            "Visionary": 0.15,
            "Analyst": 0.20,
            "Creator": 0.15,
            "Rebel": 0.15,
            "Empath": 0.15,
        }

    def analyze_intent(self, user_input: str) -> Dict:
        lower = user_input.lower()
        if any(w in lower for w in ["research", "study", "analyze", "investigate", "explain", "how does", "why does"]):
            return {"type": "research", "complexity": "medium"}
        if any(w in lower for w in ["health", "medical", "symptom", "doctor", "treatment", "medicine", "wellness", "biohacking"]):
            return {"type": "healthcare", "complexity": "medium"}
        if any(w in lower for w in ["money", "invest", "trade", "profit", "finance", "tax", "budget", "revenue", "stock"]):
            return {"type": "finance", "complexity": "medium"}
        if any(w in lower for w in ["law", "legal", "contract", "compliance", "regulation", "rights", "attorney"]):
            return {"type": "legal", "complexity": "medium"}
        if any(w in lower for w in ["write", "create", "generate", "content", "blog", "post", "story", "image", "draw"]):
            return {"type": "creative", "complexity": "simple"}
        if any(w in lower for w in ["code", "build", "develop", "program", "app", "bug", "debug", "function", "script"]):
            return {"type": "development", "complexity": "complex"}
        if any(w in lower for w in ["email", "send", "schedule", "automate", "workflow", "task"]):
            return {"type": "automation", "complexity": "medium"}
        return {"type": "general", "complexity": "simple"}

    def process(self, user_input: str, history: list = None) -> Dict:
        intent = self.analyze_intent(user_input)
        situation = {"task": user_input, "intent": intent}

        debate = {}
        scores = {}
        for name, perspective in self.perspectives.items():
            evaluation = perspective.evaluate(situation)
            debate[name] = evaluation
            scores[name] = self.weights[name] * evaluation["confidence"]

        dominant_name = max(scores, key=lambda k: scores[k])
        dominant_perspective = debate[dominant_name]

        # Build a concise approach string
        primary = dominant_perspective["recommendation"]
        other_concerns = []
        for name, result in debate.items():
            if name != dominant_name and result["concerns"]:
                other_concerns.append(result["concerns"][0])
        approach = f"{primary}. Also consider: {', '.join(other_concerns[:2])}." if other_concerns else primary

        style = PERSPECTIVE_STYLES.get(dominant_name, "")

        return {
            "intent": intent["type"],
            "complexity": intent["complexity"],
            "dominant_perspective": dominant_name,
            "style_guidance": style,
            "approach": approach,
            "confidence": round(scores[dominant_name], 3),
            "all_perspectives": {
                name: {
                    "opinion": result["opinion"],
                    "confidence": result["confidence"],
                    "score": round(scores[name], 3),
                }
                for name, result in debate.items()
            },
        }
