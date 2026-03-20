"""
Lyra Orchestrator — lightweight Flask service.
Provides multi-perspective analysis + domain routing for the Next.js frontend.
Runs on port 5328 alongside Next.js (port 3000).
"""
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

from orchestrator import LyraOrchestrator
from domain_agents import detect_domain, get_domain_addendum, DOMAIN_AGENTS
from memory_bridge import get_user_context

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"])

lyra = LyraOrchestrator()
print("Lyra Orchestrator ready — 6 perspectives active")


@app.route("/health")
def health():
    return jsonify({
        "ok": True,
        "service": "lyra-orchestrator",
        "perspectives": list(lyra.perspectives.keys()),
    })


@app.route("/api/lyra", methods=["POST"])
def orchestrate():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    user_id = data.get("userId") or data.get("user_id")
    history = data.get("history") or []

    if not message:
        return jsonify({"error": "message required"}), 400

    # 1. Multi-perspective analysis (pure Python, no external API)
    analysis = lyra.process(message, history=history)

    # 2. Domain routing
    domain = detect_domain(message)
    domain_addendum = get_domain_addendum(domain)
    domain_agent = DOMAIN_AGENTS.get(domain) if domain else None

    # 3. User memory context from shared SQLite
    user_context = get_user_context(user_id) if user_id else {}

    return jsonify({
        "intent": analysis["intent"],
        "complexity": analysis["complexity"],
        "dominant_perspective": analysis["dominant_perspective"],
        "style_guidance": analysis["style_guidance"],
        "approach": analysis["approach"],
        "confidence": analysis["confidence"],
        "all_perspectives": analysis["all_perspectives"],
        "domain": domain,
        "domain_agent_name": domain_agent["name"] if domain_agent else None,
        "domain_addendum": domain_addendum,
        "user_context": user_context,
    })


@app.route("/api/lyra/status")
def status():
    return jsonify({
        "perspectives": list(lyra.perspectives.keys()),
        "weights": lyra.weights,
        "domains": list(DOMAIN_AGENTS.keys()),
    })


if __name__ == "__main__":
    port = int(os.environ.get("LYRA_PORT", "5328"))
    print(f"Starting Lyra Orchestrator on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
