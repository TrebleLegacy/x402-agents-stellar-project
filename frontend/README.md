# Frontend Setup & Usage Guide

## Overview

This is a Next.js frontend for configuring and launching AI agents that interact with x402 payment-required endpoints. The frontend handles:

- **Agent Configuration** - Set up agent name, model, system prompt, and temperature
- **Stellar Keypair Management** - Import or generate test keypairs for payment signing
- **Agent Chat Interface** - Chat with the configured agent
- **x402 Payment Handling** - Automatically build, sign, and submit Stellar payments for API queries

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your settings:

```bash
cp .env.local.example .env.local
```

**Environment Variables:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_X402_FACILITATOR_URL=https://testnet-facilitator.example.com
NEXT_PUBLIC_SERVER_STELLAR_ADDRESS=GCBGKJHXWPHFRDHM32ZBGV74YQ75BXLKHCS7NBO2PYMPKYJE32U7ILAS
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Step 1: Configure Your Agent

1. Fill in the agent configuration form:
   - **Name**: Display name for your agent
   - **Description**: What the agent does
   - **System Prompt**: Instructions for the AI model
   - **Model**: Choose from GPT-4o, GPT-4 Turbo, or GPT-3.5 Turbo
   - **Temperature**: Creativity level (0-1)
   - **Max Tokens**: Response length limit

2. Add your Stellar keypair:
   - **Public Key**: Your Stellar account address (G...)
   - **Secret Key**: Your account secret key (S...)
   - Or use "Generate Demo Keypair" for testing

3. Click **Launch Agent** to start

### Step 2: Chat with Agent

1. Type your query in the message input
2. The agent will respond to queries on paid endpoints
3. Payments are handled automatically:
   - Frontend detects HTTP 402 response (Payment Required)
   - Builds a Stellar payment transaction
   - Signs with your keypair
   - Resubmits request with Payment-Signature header
   - Server verifies and settles payment

### Paid Endpoints

These endpoints require x402 payment:

- `GET /api/agent/query` - $0.001 per query
- `POST /api/payments/build` - $0.005 per build

Payment costs are paid via Stellar testnet transactions.

## Architecture

### Components

- **AgentConfig** - Form for agent setup and keypair management
- **AgentChat** - Message interface for agent interaction
- **x402PaymentClient** - Builds and signs Stellar transactions
- **AgentAPIClient** - Handles API requests with payment retry logic

### Payment Flow

```
1. User sends message
   ↓
2. Frontend sends GET /api/agent/query
   ↓
3. Server returns 402 Payment Required (first time)
   ↓
4. Frontend receives payment instructions
   ↓
5. Frontend builds unsigned Stellar transaction
   ↓
6. Frontend signs with user's keypair
   ↓
7. Frontend creates Payment-Signature header (base64)
   ↓
8. Frontend resubmits request with header
   ↓
9. Server verifies signature with facilitator
   ↓
10. Server settles payment
   ↓
11. Server returns 200 OK with response
```

## Building for Production

```bash
npm run build
npm start
```

### Production Checklist

- [ ] Update `NEXT_PUBLIC_API_URL` to production backend
- [ ] Change `NEXT_PUBLIC_STELLAR_NETWORK` to `mainnet`
- [ ] Update `NEXT_PUBLIC_X402_FACILITATOR_URL` to production facilitator
- [ ] Set `NEXT_PUBLIC_SERVER_STELLAR_ADDRESS` to production receiving address
- [ ] Store private keys securely (never in .env files)
- [ ] Enable HTTPS
- [ ] Set up proper error tracking
- [ ] Configure rate limiting

## Troubleshooting

### "Payment required. Please provide destination address."

- Make sure `NEXT_PUBLIC_SERVER_STELLAR_ADDRESS` is set in `.env.local`
- This should be the Stellar address of the payment receiver

### "Failed to get response"

- Check that backend is running on `NEXT_PUBLIC_API_URL`
- Verify your keypair has funds on testnet (use Friendbot for testing)
- Check browser console for detailed error messages

### "Invalid session_id format"

- Session IDs are generated automatically as UUIDs
- Don't manually edit the session ID

## Testing

### With Test Backend

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. In frontend:
   - Fill agent config
   - Generate demo keypair
   - Launch agent
   - Try a simple query like "Hello"

### Without Real Payments

To test the chat interface without actual payments, you can:
1. Mock the payment response in the API client
2. Temporarily disable x402 middleware on test endpoint

## Files Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx        - Root layout
│   │   ├── page.tsx          - Main application page
│   │   └── globals.css       - Global styles
│   ├── components/
│   │   ├── AgentConfig.tsx   - Config form
│   │   ├── AgentChat.tsx     - Chat interface
│   ├── lib/
│   │   ├── x402Client.ts     - Payment transaction builder
│   │   └── api.ts            - API client with payment retry
│   ├── types/
│   │   └── agent.ts          - TypeScript type definitions
├── package.json
├── tsconfig.json
├── next.config.js            - Next.js configuration
└── .env.local.example        - Environment template
```

## Next Steps

- Customize the UI/styling
- Add agent history and persistence
- Implement user authentication
- Add payment confirmation dialogs
- Set up payment monitoring/analytics
- Deploy to production environment

## Support

For issues or questions, refer to:
- Backend documentation: [../backend/X402_TESTING_GUIDE.md](../backend/X402_TESTING_GUIDE.md)
- Stellar SDK docs: https://developers.stellar.org/docs/build/sdks/js-stellar-sdk
- Next.js docs: https://nextjs.org/docs
