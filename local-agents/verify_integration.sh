#!/bin/bash
# OmniHub Local Agent Integration - End-to-End Verification Script

set -e

# Constants
readonly SEPARATOR="=========================================="

echo "$SEPARATOR"
echo "OmniHub Local Agent Integration Verification"
echo "$SEPARATOR"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "1. Checking prerequisites..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ python3 not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ python3 found${NC}"

if ! python3 -c "import aiohttp" 2>/dev/null; then
    echo -e "${YELLOW}! aiohttp library not found, installing...${NC}"
    pip install aiohttp
fi
echo -e "${GREEN}✓ aiohttp library available${NC}"

# Check environment
echo ""
echo "2. Checking environment configuration..."
if [[ ! -f .env ]]; then
    echo -e "${YELLOW}! .env not found, copying from .env.example${NC}"
    cp .env.example .env
    echo -e "${RED}✗ Please edit .env with your actual OmniHub credentials${NC}"
    exit 1
fi

source .env

if [[ -z "$OMNIHUB_BASE_URL" || "$OMNIHUB_BASE_URL" == "https://your-project.supabase.co/functions/v1" ]]; then
    echo -e "${RED}✗ OMNIHUB_BASE_URL not configured in .env${NC}"
    exit 1
fi

if [[ -z "$OMNIHUB_API_KEY" || "$OMNIHUB_API_KEY" == *"xxxxx"* ]]; then
    echo -e "${RED}✗ OMNIHUB_API_KEY not configured in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo "  Base URL: $OMNIHUB_BASE_URL"
echo "  Source: $OMNIHUB_SOURCE"
echo "  Worker ID: $OMNIHUB_WORKER_ID"

# Test OmniLink Port health
echo ""
echo "3. Testing OmniLink Port connectivity..."
HEALTH_URL="${OMNIHUB_BASE_URL}/omnilink-port/health"
if curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OmniLink Port is healthy${NC}"
else
    echo -e "${RED}✗ Cannot reach OmniLink Port at $HEALTH_URL${NC}"
    echo "  Make sure Supabase is running and OMNILINK_ENABLED=true"
    exit 1
fi

# Run Lead-Gen simulation
echo ""
echo "4. Running Lead-Gen telemetry simulation..."
export OMNIHUB_SOURCE=lead-gen
export OMNIHUB_WORKER_ID=lead-gen-verify-01
export LEAD_GEN_MODE=simulate

if python3 lead_gen_agent.py 2>&1 | grep -q "Simulation complete"; then
    echo -e "${GREEN}✓ Lead-Gen telemetry emitted successfully${NC}"
else
    echo -e "${RED}✗ Lead-Gen simulation failed${NC}"
    exit 1
fi

# Run APEX-Sales simulation
echo ""
echo "5. Running APEX-Sales telemetry simulation..."
export OMNIHUB_SOURCE=apex-sales
export OMNIHUB_WORKER_ID=apex-sales-verify-01
export APEX_SALES_MODE=simulate

if python3 apex_sales_agent.py 2>&1 | grep -q "Simulation complete"; then
    echo -e "${GREEN}✓ APEX-Sales telemetry emitted successfully${NC}"
else
    echo -e "${RED}✗ APEX-Sales simulation failed${NC}"
    exit 1
fi

# Summary
echo ""
echo "$SEPARATOR"
echo "Verification Complete!"
echo "$SEPARATOR"
echo ""
echo "Next steps:"
echo "1. Open OmniDash: http://localhost:5173/omnidash/local-agents"
echo "   - Verify analytics show data from both sources"
echo ""
echo "2. Create a task: http://localhost:5173/omnidash/tasks"
echo "   - Target: apex-sales or lead-gen"
echo "   - Action: echo"
echo "   - Payload: {\"message\": \"test\"}"
echo ""
echo "3. Run a worker to claim and execute tasks:"
echo "   APEX_SALES_MODE=worker python3 apex_sales_agent.py"
echo "   or"
echo "   LEAD_GEN_MODE=worker python3 lead_gen_agent.py"
echo ""
echo -e "${GREEN}✓ All verification checks passed!${NC}"
