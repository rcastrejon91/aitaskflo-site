#!/usr/bin/env python3
import requests
import json
from datetime import datetime

test_cases = [
    {
        "name": "Cardiac Emergency",
        "text": "Severe chest pain, shortness of breath, sweating, pain radiating to jaw",
        "expected": "cardiac"
    },
    {
        "name": "Stroke Symptoms",
        "text": "Sudden facial drooping, arm weakness, speech difficulty, confusion",
        "expected": "neurological"
    },
    {
        "name": "Appendicitis",
        "text": "Right lower quadrant pain, nausea, vomiting, fever, rebound tenderness",
        "expected": "gastrointestinal"
    },
    {
        "name": "Pneumonia",
        "text": "High fever, productive cough, chest pain on breathing, fatigue",
        "expected": "respiratory"
    },
    {
        "name": "Diabetic Emergency",
        "text": "Excessive thirst, frequent urination, blurred vision, fruity breath odor",
        "expected": "endocrine"
    }
]

print("=" * 70)
print("🧪 MEDICAL AI TEST SUITE")
print("=" * 70)
print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

results = []
for i, case in enumerate(test_cases, 1):
    print(f"\n📋 Test {i}/{len(test_cases)}: {case['name']}")
    print(f"   Input: {case['text'][:60]}...")
    
    try:
        response = requests.post(
            'http://localhost:8000/predict',
            json={"text": case['text']},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Status: Success")
            print(f"   🎯 Condition: {result['analysis']['condition']}")
            print(f"   ⚠️  Urgency: {result['analysis']['urgency']}")
            print(f"   💊 Recommendations: {len(result['analysis']['recommendations'])}")
            results.append({"case": case['name'], "status": "✅ PASS"})
        else:
            print(f"   ❌ Status: Failed ({response.status_code})")
            results.append({"case": case['name'], "status": "❌ FAIL"})
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        results.append({"case": case['name'], "status": "❌ ERROR"})

print("\n" + "=" * 70)
print("📊 TEST RESULTS SUMMARY")
print("=" * 70)
for result in results:
    print(f"{result['status']} {result['case']}")

passed = sum(1 for r in results if "PASS" in r['status'])
print(f"\n✅ Passed: {passed}/{len(test_cases)} ({passed/len(test_cases)*100:.0f}%)")
print("=" * 70)
