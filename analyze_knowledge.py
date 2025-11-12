#!/usr/bin/env python3
import json
from collections import Counter
from datetime import datetime

with open('data/knowledge_base.json', 'r') as f:
    kb = json.load(f)

print("=" * 70)
print("🧠 KNOWLEDGE BASE ANALYSIS")
print("=" * 70)
print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

discoveries = kb.get('discoveries', [])
print(f"📚 Total Discoveries: {len(discoveries)}")

if discoveries:
    # Confidence distribution
    confidences = [d['confidence'] for d in discoveries]
    avg_confidence = sum(confidences) / len(confidences)
    print(f"📊 Average Confidence: {avg_confidence:.1%}")
    
    # Status breakdown
    statuses = Counter(d['status'] for d in discoveries)
    print(f"\n📈 Status Breakdown:")
    for status, count in statuses.items():
        print(f"   {status}: {count}")
    
    # Recent discoveries
    print(f"\n🔬 Latest 5 Discoveries:")
    for i, disc in enumerate(discoveries[-5:], 1):
        print(f"\n   {i}. {disc['title']}")
        print(f"      Confidence: {disc['confidence']:.1%}")
        print(f"      Status: {disc['status']}")
        print(f"      Time: {disc['timestamp']}")

print("\n" + "=" * 70)
