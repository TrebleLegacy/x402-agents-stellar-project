# x402 Payment SDK (Stellar)

## Quickstart

### Install

Backend:

npm install

Frontend:

npm install

### Create a testnet wallet

POST http://localhost:8000/api/stellar/test/generate-keypair

### Server: wrap a paid endpoint

Use the SDK wrapper in an Express route:

import { createX402ServerFromEnv } from '../sdk/x402/server';

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

### Agent: call a paid endpoint

import { X402SdkClient } from './x402Sdk';

const sdk = new X402SdkClient('http://localhost:8000', 'testnet');

sdk.setWallet({ publicKey, secret });

const response = await sdk.payAndRequest({
  method: 'post',
  path: '/api/x402-sdk/demo/echo',
  data: { message: 'hello' },
});

## End-to-end flow

1. Client requests the endpoint
2. Server responds with 402 and payment instructions
3. Client builds and signs a Stellar payment transaction
4. Client retries with Payment-Signature header
5. Server verifies payment and returns the response

## Configuration

Environment variables:

X402_NETWORK=stellar:testnet
X402_API_KEY=your_x402_api_key
X402_FACILITATOR_URL=https://channels.openzeppelin.com/x402/testnet
X402_PAY_TO=your_server_public_key
X402_STRICT_FACILITATOR=false

Optional asset configuration:

X402_ASSET_CODE=USDC
X402_ASSET_ISSUER=G...

## Architecture Overview

The server SDK wraps Express handlers and enforces:
- 402 responses for unpaid requests
- payment instruction payloads
- transaction parsing and validation
- replay protection with transaction hash caching
- optional facilitator verification and settlement

The client SDK:
- detects 402 responses
- parses payment instructions
- builds and signs Stellar transactions
- retries requests with Payment-Signature

## Example: Server Integration

backend/src/api/routes/x402.sdk.demo.ts

## Example: Agent Integration

frontend/src/lib/x402Sdk.ts
frontend/src/lib/specialistAgents.ts
