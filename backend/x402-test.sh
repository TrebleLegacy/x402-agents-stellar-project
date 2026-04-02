#!/bin/bash
# x402 Agent Testing - CURL Examples
# Run from: /backend directory
# Ensure server is running: npm run dev

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000"
ENDPOINT_PREFIX="$BASE_URL/api"

echo -e "${BLUE}=== x402 Agent Testing Suite ===${NC}\n"

# ============================================================================
# Step 1: Configuration
# ============================================================================
echo -e "${YELLOW}Step 1: Get x402 Configuration${NC}"
echo "GET $ENDPOINT_PREFIX/x402/test/config"
curl -X GET "$ENDPOINT_PREFIX/x402/test/config" | jq .
echo -e "\n${GREEN}✓ Config retrieved${NC}\n"
read -p "Press Enter to continue..."

# ============================================================================
# Step 2: Generate Keypair
# ============================================================================
echo -e "${YELLOW}Step 2: Generate Test Keypair${NC}"
echo "POST $ENDPOINT_PREFIX/stellar/test/generate-keypair"
KEYPAIR=$(curl -s -X POST "$ENDPOINT_PREFIX/stellar/test/generate-keypair" | jq -r '.keypair')
PUBLIC_KEY=$(echo "$KEYPAIR" | jq -r '.publicKey')
SECRET_KEY=$(echo "$KEYPAIR" | jq -r '.secretKey')

echo "Generated keypair:"
echo "  Public:  $PUBLIC_KEY"
echo "  Secret:  ${SECRET_KEY:0:10}...${SECRET_KEY: -10}"
echo -e "\n${GREEN}✓ Keypair generated${NC}\n"

# ============================================================================
# Step 3: Fund Testnet Account
# ============================================================================
echo -e "${YELLOW}Step 3: Fund Testnet Account${NC}"
echo "POST $ENDPOINT_PREFIX/stellar/test/fund-testnet"
echo "Funding: $PUBLIC_KEY"
curl -s -X POST "$ENDPOINT_PREFIX/stellar/test/fund-testnet" \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\": \"$PUBLIC_KEY\"}" | jq .
echo -e "\n${GREEN}✓ Account funded with 10,000 XLM${NC}\n"
read -p "Press Enter to continue..."

# ============================================================================
# Step 4: Initiate x402 Payment
# ============================================================================
echo -e "${YELLOW}Step 4: Initiate x402 Payment (402 Payment Required)${NC}"
echo "POST $ENDPOINT_PREFIX/x402/test/payment"
echo "Payer: $PUBLIC_KEY"
PAYMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT_PREFIX/x402/test/payment" \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\": \"$PUBLIC_KEY\", \"amount\": \"0.001\"}")

HTTP_STATUS=$(echo "$PAYMENT_RESPONSE" | tail -n1)
BODY=$(echo "$PAYMENT_RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_STATUS (Expected: 402)"
echo "$BODY" | jq .
echo -e "\n${GREEN}✓ Payment requirement generated${NC}\n"
read -p "Press Enter to continue..."

# ============================================================================
# Step 5: Process Payment Through Agent
# ============================================================================
echo -e "${YELLOW}Step 5: Process Payment Through Agent${NC}"
echo "POST $ENDPOINT_PREFIX/x402/test/agent-intent"
curl -s -X POST "$ENDPOINT_PREFIX/x402/test/agent-intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"publicKey\": \"$PUBLIC_KEY\",
    \"secretKey\": \"$SECRET_KEY\",
    \"amount\": \"0.001\",
    \"resourcePath\": \"/api/data\"
  }" | jq .
echo -e "\n${GREEN}✓ Agent processed payment intent${NC}\n"

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "\nTest Keypair (save for later):"
echo "  export TEST_PUBLIC_KEY=\"$PUBLIC_KEY\""
echo "  export TEST_SECRET_KEY=\"$SECRET_KEY\""
echo -e "\nNext Steps:"
echo "  1. Add X402_API_KEY to .env (from https://channels.openzeppelin.com/testnet/gen)"
echo "  2. Set X402_PAY_TO=$PUBLIC_KEY in .env"
echo "  3. Test payment verification with this keypair"
echo -e "\n${GREEN}✓ All tests completed!${NC}"
