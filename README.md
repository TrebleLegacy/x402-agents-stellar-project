# 🚀 x402 Agentic Payments — Stellar Hackathon Submission

> "Agents are one of the biggest stories in tech right now, but most agents still run into the same hard stop: payments."

**x402 Agentic Payments** provides the rails for AI agents to act economically, not just conversationally. By combining the HTTP 402 "Payment Required" standard with the **Stellar Network**, we enable agents to natively buy, sell, coordinate, and earn through stablecoin micropayments and MPP-style (Machine Payments Protocol) flows.

---

## 🌟 The Vision: Autonomous Machine-to-Machine Economies

Today, AI agents can reason, plan, and act—right up until they need to access a premium API, unlock a paid tool, or buy a dataset. They hit a paywall and stop, paralyzed without a human's credit card or API key.

With **x402 on Stellar**, we turn ordinary HTTP requests into paid interactions. This project demonstrates what happens when agents are economically empowered:
- **Onchain Paywalls:** APIs monetize every useful call instantly rather than hiding behind rigid subscriptions.
- **Machine Payments Protocol (MPP) Flows:** True machine-to-machine payment pipelines built for paid resources, programmable access, and microtransactions.
- **Agent-to-Agent Coordination:** Specialized agents (DeFi, Security, News) bidding on tasks and hiring each other autonomously.

Stellar is the perfect backbone for this shift due to its fast settlement, near-zero transaction costs, robust stablecoin infrastructure, and programmable guardrails. Software can finally act economically.

## ⚠️ Project Status & Mocked Data (Hackathon Transparency)

In the spirit of the hackathon requirements, here is exactly what is production-ready and what is currently simulated or mocked:

**What is Real & Onchain:**
- **x402 Protocol Implementation:** The backend legitimately intercepts requests, calculates pricing, and returns authentic `402 Payment Required` headers containing Stellar payment intents.
- **Stellar Network Transactions:** Agents successfully generate persistent wallets, build transactions, sign, and submit real XLM payments on the Stellar Testnet. 
- **LangChain Reasoning:** The specialized agents (DeFi, News, Security) use real OpenAI LLM calls (`gpt-4o` or `gpt-4o-mini`) to parse intents, strategize, and synthesize data.
- **Public API Tooling:** Several premium agent tools (Weather via Open-Meteo, GitHub repo search, CoinGecko pricing, HackerNews) execute legitimate public `fetch()` requests when unlocked.

**What is Mocked/Simulated:**
- **Private API Paywalls (Simulated via LLM):** To demonstrate a wide marketplace of paid agent tools without requiring reviewers to provide dozens of private API keys (like Stripe, Twilio), we built a `simulateWithLlm` function. When an agent pays to access "Stripe Balance" or "Twilio Account," the backend uses an LLM to dynamically generate realistic fake JSON data matching the target API's schema.
- **Soroban Smart Contract Policies:** While Stellar classic transactions (payments and memo verification) handle the current authorization and settlement, advanced Soroban programmable guardrails (e.g., onchain spending limits per agent) are conceptualized but not fully implemented in this current iteration.

---

## ✨ Core Features

- ✅ **x402 Payment Integration**: HTTP 402 responses seamlessly bridging web requests to Stellar.
- ✅ **Stellar Testnet Support**: Instant XLM microtransactions, account funding, and programmatic verification.
- ✅ **AI Agent Marketplace**: Agents navigating native web paywalls autonomously.
- ✅ **SDK Layer**: Wrap any standard Express API endpoint with `.wrapEndpoint()` to instantly monetize it for AI agents.

## 🛠️ Tech Stack

- **Backend**: Node.js + Express (TypeScript)
- **Blockchain**: @stellar/stellar-sdk
- **AI/Agents**: @langchain/core, @langchain/openai
- **Database**: Supabase (optional)

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- NPM or Yarn
- OpenAI API key (for agent features)
- Stellar testnet account

### Installation

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Configuration

Update `backend/.env`:

```env
# Server
PORT=8000

# JWT
JWT_SECRET=your_jwt_secret

# OpenAI (for agents)
OPENAI_API_KEY=sk-proj-...
AGENT_MODEL=gpt-4o

# Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Stellar
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_FRIENDBOT_URL=https://friendbot.stellar.org

# x402
X402_NETWORK=stellar:testnet
X402_API_KEY=your_x402_api_key
X402_FACILITATOR_URL=https://channels.openzeppelin.com/x402/testnet
X402_PAY_TO=your_server_public_key
X402_STRICT_FACILITATOR=false
```

---

## SDK Quickstart

Server wrapper:

```ts
import { createX402ServerFromEnv } from './sdk/x402/server';

const x402 = createX402ServerFromEnv();

router.post(
  '/demo/echo',
  x402.wrapEndpoint({
    price: '0.01',
    asset: 'XLM',
    description: 'SDK demo endpoint',
    handler: async (req) => {
      return { success: true, echo: req.body };
    },
  })
);
```

Agent client:

```ts
import { X402SdkClient } from './lib/x402Sdk';

const sdk = new X402SdkClient('http://localhost:8000', 'testnet');
sdk.setWallet({ publicKey, secret });

const response = await sdk.payAndRequest({
  method: 'post',
  path: '/api/x402-sdk/demo/echo',
  data: { message: 'hello' },
});
```

Full SDK documentation: docs/x402-sdk.md

## 📚 Running x402

### 1. Start the Server

```bash
npm run dev
```

Expected output:
```
[dotenv@17.3.1] injecting env from .env
✅ Supabase configured
[INFO] Agent initialized with Stellar tools available
[INFO] Server running on port 8000
```

### 2. Verify x402 Configuration

```bash
curl http://localhost:8000/api/x402/test/config | jq '.'
```

Response:
```json
{
  "success": true,
  "config": {
    "facilitatorUrl": "https://channels.openzeppelin.com/x402/testnet",
    "network": "stellar:testnet",
    "payTo": "GCBGKJHXWPHFRDHM32ZBGV74YQ75BXLKHCS7NBO2PYMPKYJE32U7ILAS",
    "apiKeySet": true,
    "payToSet": true
  },
  "status": {
    "ready": true,
    "message": "x402 service initialized"
  }
}
```

### 3. Trigger x402 Payment

```bash
# Generate test keypair
TEST_KEYPAIR=$(curl -s -X POST http://localhost:8000/api/stellar/test/generate-keypair)
TEST_PUBKEY=$(echo $TEST_KEYPAIR | jq -r '.keypair.publicKey')

# Fund the account
curl -s -X POST http://localhost:8000/api/stellar/test/fund-testnet \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\": \"$TEST_PUBKEY\"}"

# Request x402 payment (returns 402 Payment Required)
curl -X POST http://localhost:8000/api/x402/test/payment \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\": \"$TEST_PUBKEY\", \"amount\": \"0.001\"}" | jq '.'
```

Server logs:
```
[x402-test] POST /payment - Processing x402 payment
[x402-test] Public key validated
[x402-test] Sending 402 Payment Required
```

---

## 🤖 Running Agents

### 1. Agent Intent Processing

Agents can parse natural language payment intents:

```bash
curl -X POST http://localhost:8000/api/agent/intent \
  -H "Content-Type: application/json" \
  -d "{
    \"intent\": \"Send 50 XLM to GBUQWP2BOUZX34ULNQG23RQ6F4BFSRJSU6CNZ4NZ4KEKJGQSTE7CWGX\",
    \"context\": {
      \"userPublicKey\": \"GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJsu6CNZ4NZ4KEKJGQSTE7CWGX\",
      \"userSecretKey\": \"SBZX...\"
    }
  }"
```

Response:
```json
{
  "success": true,
  "action": "payment",
  "parameters": {
    "destination": "GBUQWP2BOUZX34ULNQG23RQ6F4BFSRJSU6CNZ4NZ4KEKJGQSTE7CWGX",
    "amount": "50",
    "asset": "XLM"
  }
}
```

### 2. Agent Tools Available

The agent has access to these blockchain tools:

- `create_wallet` - Create or link a Stellar wallet
- `get_balance` - Check account balance
- `get_account` - Fetch account details
- `build_payment` - Build unsigned payment transaction
- `submit_transaction` - Sign and submit transaction
- `get_operation_history` - View transaction history

### 3. Full Agent Workflow

```bash
# 1. Create session
SESSION=$(curl -s -X POST http://localhost:8000/api/agent/session | jq -r '.sessionId')

# 2. Send natural language intent
curl -s -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION\",
    \"message\": \"Generate a keypair and fund it\",
    \"context\": {}
  }" | jq '.'

# 3. Check balance
curl -s -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION\",
    \"message\": \"What's my current balance?\",
    \"context\": {}
  }" | jq '.'
```

---

## 📖 Testing Guides

### Full Testing Documentation

See dedicated guides for comprehensive testing:

- **[TESTING_GUIDE.md](backend/TESTING_GUIDE.md)** — All 9 features with step-by-step examples
- **[X402_REALTIME_TEST.md](backend/X402_REALTIME_TEST.md)** — Real-time x402 testing with server logs
- **[X402_TESTING_GUIDE.md](backend/X402_TESTING_GUIDE.md)** — Original x402 testing documentation
- **[X402_AGENT_INTEGRATION.md](backend/X402_AGENT_INTEGRATION.md)** — Agent integration examples

### Quick Test Script

```bash
cd backend

# Run automated tests
chmod +x test-x402.sh
./test-x402.sh
```

Or use the full test guide:

```bash
# Follow real-time testing workflow
cat X402_REALTIME_TEST.md
```

---

## 🏗️ Architecture

### Directory Structure

```
backend/
├── src/
│   ├── agents/              # Unified agent layer
│   │   ├── graph.ts        # LangChain agent state machine
│   │   ├── tools.ts        # Tool definitions for agents
│   │   ├── routes.ts       # Agent API endpoints
│   │   ├── paymentAgent.ts # Payment intent handler
│   │   └── x402Agent.ts    # x402 payment processor
│   ├── api/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Express middleware
│   │   └── repository/     # Data access layer
│   ├── stellar/            # Stellar blockchain client
│   ├── services/           # x402, payment, onboarding services
│   └── server.ts           # Express app entry point
└── .env.example            # Environment template
```

### Request Flow

```
HTTP Request
    ↓
Express Router
    ↓
Middleware (Auth, Validation)
    ↓
Route Handler
    ↓
Service Layer (x402Service, PaymentService)
    ↓
Agent (Optional for natural language)
    ↓
Stellar Client (StellarClient)
    ↓
Horizon API (Stellar Network)
    ↓
HTTP Response
```

---

## 🔌 API Endpoints

### x402 Endpoints

- `GET /api/x402/test/config` — Get x402 configuration
- `POST /api/x402/test/payment` — Trigger x402 payment (returns 402)

### Stellar Endpoints

- `POST /api/stellar/test/generate-keypair` — Generate random keypair
- `POST /api/stellar/test/fund-testnet` — Fund account via Friendbot

### Payment Endpoints

- `POST /api/payments/build` — Build unsigned payment XDR
- `POST /api/payments/submit` — Sign and submit payment
- `GET /api/payments/balance/:publicKey` — Check XLM balance

### Agent Endpoints

- `POST /api/agent/session` — Create agent session
- `POST /api/agent/chat` — Send message to agent
- `POST /api/agent/intent` — Parse payment intent

---

## 🐛 Troubleshooting

### Server won't start

```bash
# Check port conflicts
lsof -i :8000

# Kill process if needed
fuser -k 8000/tcp
```

### x402 not responding

```bash
# Verify .env variables
grep X402 .env

# Check configuration
curl http://localhost:8000/api/x402/test/config
```

### Agent not responding

```bash
# Verify OpenAI key
echo $OPENAI_API_KEY

# Check agent logs
npm run dev 2>&1 | grep -i agent
```

### Stellar transaction fails

```bash
# Ensure account is funded
curl http://localhost:8000/api/payments/balance/$PUBLIC_KEY

# Fund if needed
curl -X POST http://localhost:8000/api/stellar/test/fund-testnet \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\": \"$PUBLIC_KEY\"}"
```

---

## 📚 Learn More

- [Stellar Documentation](https://developers.stellar.org)
- [x402 Protocol](https://channels.openzeppelin.com/x402)
- [LangChain Documentation](https://js.langchain.com)
- [Soroban Docs](https://soroban.stellar.org)

---

## 📄 License

MIT License - Built for Stellar Hackathon 2026

---

Made with ❤️ for the Stellar ecosystem
