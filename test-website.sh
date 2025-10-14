#!/bin/bash

echo "🧪 Testing AITaskFlo Website"
echo "=============================="
echo ""

# Test homepage
echo "1️⃣ Testing Homepage..."
HOMEPAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$HOMEPAGE" = "200" ]; then
    echo "   ✅ Homepage working (Status: $HOMEPAGE)"
else
    echo "   ❌ Homepage failed (Status: $HOMEPAGE)"
fi

# Test login page
echo "2️⃣ Testing Login Page..."
LOGIN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login.html)
if [ "$LOGIN" = "200" ]; then
    echo "   ✅ Login page working (Status: $LOGIN)"
else
    echo "   ❌ Login page failed (Status: $LOGIN)"
fi

# Test register page
echo "3️⃣ Testing Register Page..."
REGISTER=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/register.html)
if [ "$REGISTER" = "200" ]; then
    echo "   ✅ Register page working (Status: $REGISTER)"
else
    echo "   ❌ Register page failed (Status: $REGISTER)"
fi

# Test dashboard page
echo "4️⃣ Testing Dashboard Page..."
DASHBOARD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/dashboard.html)
if [ "$DASHBOARD" = "200" ]; then
    echo "   ✅ Dashboard page working (Status: $DASHBOARD)"
else
    echo "   ❌ Dashboard page failed (Status: $DASHBOARD)"
fi

# Test API
echo "5️⃣ Testing Auth API..."
API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/auth/users)
if [ "$API" = "200" ]; then
    echo "   ✅ API working (Status: $API)"
else
    echo "   ❌ API failed (Status: $API)"
fi

echo ""
echo "=============================="
echo "🎉 All tests completed!"
echo ""
echo "🌐 Open in browser:"
echo "   http://localhost:3001/"
