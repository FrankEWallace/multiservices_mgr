#!/bin/bash

# Dashboard Filter Testing Script
# Tests the /kpis endpoint with various filter combinations

echo "=== Dashboard Filter Tests ==="
echo ""

echo "1. Testing WITHOUT filters (baseline):"
curl -s "http://localhost:3000/api/dashboard/kpis" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Revenue: \${data['kpis'][0]['value']:,}\")"
echo ""

echo "2. Testing with SERVICE filter (Real Estate - ID 9):"
curl -s "http://localhost:3000/api/dashboard/kpis?serviceId=9" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Revenue: \${data['kpis'][0]['value']:,}\")"
echo ""

echo "3. Testing with SERVICE filter (Retail - ID 11):"
curl -s "http://localhost:3000/api/dashboard/kpis?serviceId=11" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Revenue: \${data['kpis'][0]['value']:,}\")"
echo ""

echo "4. Testing with DATE RANGE filter (January 2026):"
curl -s "http://localhost:3000/api/dashboard/kpis?startDate=2026-01-01&endDate=2026-01-31" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Revenue: \${data['kpis'][0]['value']:,}\")"
echo ""

echo "5. Testing with DATE RANGE filter (February 2026):"
curl -s "http://localhost:3000/api/dashboard/kpis?startDate=2026-02-01&endDate=2026-02-08" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Revenue: \${data['kpis'][0]['value']:,}\")"
echo ""

echo "6. Testing with BOTH filters (Retail + February):"
curl -s "http://localhost:3000/api/dashboard/kpis?serviceId=11&startDate=2026-02-01&endDate=2026-02-08" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Revenue: \${data['kpis'][0]['value']:,}\")"
echo ""

echo "7. Testing with BOTH filters (Real Estate + February):"
curl -s "http://localhost:3000/api/dashboard/kpis?serviceId=9&startDate=2026-02-01&endDate=2026-02-08" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Revenue: \${data['kpis'][0]['value']:,}\")"
echo ""

echo "=== All Filter Tests Complete ==="
