# FORGE v2  
### A Trust-Aware, Competitive Runtime for Economically Intelligent Agents on Stellar

---

## What Changed From the Original Idea

The original FORGE was strong, but had critical weaknesses:

### Original Issues

1. **Blind Delegation**
   - Orchestrator selects agents and pays them directly  
   - No verification of quality, reliability, or truth  

2. **Static Selection**
   - Agents are discovered once and used  
   - No competition, no bidding, no dynamic pricing  

3. **No Economic Decision Intelligence**
   - Payments happen, but agents don’t deeply reason about:
     - whether to pay  
     - how much to pay  
     - which combination is optimal  

4. **Linear Execution Graph**
   - Orchestrator → specialist → sub-call  
   - No real multi-agent decision graph  

5. **Trust Assumed, Not Measured**
   - System assumes agents behave correctly  
   - No mechanism to evaluate or compare them  

---

## The Evolution

FORGE v2 transforms from:

> “Agents that can pay other agents”

into:

> **“Agents that compete, evaluate, and coordinate economically under uncertainty”**

---

# The New Core Idea

FORGE v2 is a runtime where agents:

- **compete to fulfill tasks**
- **pay to evaluate each other before trusting**
- **compose into multi-step decision graphs**
- **optimize execution based on cost vs value**

Every interaction is:
- dynamic  
- paid (x402)  
- decision-driven  

---

# Non-Negotiable Constraint: No Mocks

FORGE v2 runs only on live LLM interactions:

- Every agent response is produced by an LLM call
- Bids, audits, scoring, and routing decisions are LLM outputs
- No stubbed APIs, canned fixtures, or scripted responses in demos or tests

---

# Implementation Requirements

- Bid responses, audits, and routing decisions must come from live LLM calls
- Every paid interaction follows the x402 flow: 402 response, payment, retry, result
- Each LLM call is logged with request/response ids for traceability
- No hardcoded scoring tables or static fallback decisions
- Caching is limited to raw LLM outputs, not precomputed answers

---

# Demo Checklist

- Broadcast a task to at least 3 agents and show their bids
- Pay for at least 2 audits before selecting a winner
- Execute a decision graph with at least 2 optional steps
- Confirm each agent reply is from a live LLM call
- Display total spend and the selected outcome

---

# What FORGE v2 Is

A **market-driven agent execution layer**, where:

- APIs are no longer static endpoints  
- they become **economic actors**  
- competing, pricing, and interacting  

Agents do not:
- blindly call services  

They:
- **query multiple options**
- **pay to evaluate them**
- **select the best based on tradeoffs**

---

# The New System Dynamics

## 1. Agent Competition Network

Instead of:

Orchestrator → picks one API  

We now have:

Orchestrator → broadcasts intent  

Example:

Request:
“Convert 500 BRL to USDC”

---

Multiple Conversion Agents respond:

- Agent A → 0.05 USDC, latency 200ms  
- Agent B → 0.08 USDC, latency 80ms  
- Agent C → 0.03 USDC, unknown reliability  

---

The orchestrator:
- pays for bids (x402)
- evaluates them
- selects the best option  

---

## 2. Trust-First Execution

Before calling any agent:

The orchestrator may:

- pay auditor agents  
- verify:
  - correctness  
  - uptime  
  - latency  

---

Example:

GET /audit?target=AgentA  
← 402: 0.01 USDC  
→ pays → receives reliability score  

---

Trust becomes:
- measurable  
- purchasable  
- comparable  

---

## 3. Multi-Agent Decision Graph

Execution is no longer linear.

Instead of:

Orchestrator → Agent  

We now have:

Orchestrator → Risk Agent → Route Agent → Execution Agent  

Each step:
- independent  
- paid  
- optional  

---

Example chain:

1. Risk Agent → evaluates volatility  
2. Route Agent → finds best conversion path  
3. Execution Agent → executes transaction  

---

Each agent:
- charges via x402  
- returns partial intelligence  

---

## 4. Cost-Aware Reasoning

Agents now reason about:

- Is this API worth paying for?  
- Should I query multiple providers?  
- Is cheaper but riskier acceptable?  

---

Example:

“Pay 0.01 USDC to improve route accuracy by 2%?”

This transforms agents into:

> **economic decision-makers, not just executors**

---

## 5. Recursive API Composition

Agents are no longer isolated.

They can:

- call other agents  
- pay them  
- compose services dynamically  

---

Example:

Conversion Agent:
- pays Liquidity Agent  
- pays Risk Agent  

---

This creates:

> **a recursive payment graph across agents**

---

# Updated Flow

User:
"Find best way to convert 500 BRL to USDC"

---

Step 1 — Broadcast

Orchestrator requests bids from multiple conversion agents  

---

Step 2 — Audit

Orchestrator pays auditor agents to evaluate top candidates  

---

Step 3 — Decision Graph

Orchestrator builds execution chain:
- optional risk analysis  
- route optimization  
- execution  

---

Step 4 — Execution

Selected agent executes transaction via Stellar  

---

Step 5 — Result

Best outcome selected based on:
- price  
- reliability  
- performance  

---

# The x402 Role (Now Stronger)

In the original version:
- x402 enabled payments  

In FORGE v2:
- x402 enables **market dynamics**

It powers:

- bidding  
- auditing  
- composition  
- decision-making  

---

Every interaction:

1. Request  
2. 402 response  
3. Payment  
4. Retry  
5. Result  

---

But now:

> Payments are not just for execution  
> They are for **information, trust, and competition**

---

# Why This Fixes the Original Problems

## Fix 1 — Blind Trust → Verified Trust

Before:
- agents trusted blindly  

Now:
- agents pay to verify  

---

## Fix 2 — Static APIs → Competitive Market

Before:
- one agent per task  

Now:
- multiple agents compete  

---

## Fix 3 — Passive Payments → Economic Reasoning

Before:
- payment = execution  

Now:
- payment = decision tool  

---

## Fix 4 — Linear Flow → Decision Graph

Before:
- single chain  

Now:
- dynamic graph of agents  

---

## Fix 5 — Isolated APIs → Composable Network

Before:
- APIs independent  

Now:
- APIs call and pay each other  

---

# Why This Is a Better Hackathon Project

- Clear differentiation  
- Strong agent interaction  
- Native use of x402  
- Real economic behavior  
- Easy to demo visually:
  - multiple agents  
  - multiple payments  
  - dynamic decisions  

---

# Final Positioning

FORGE v2 is not just:

> “agents that can pay”

It is:

> **a decentralized market where agents compete, evaluate, and coordinate through micropayments**

---

# One-Line Summary

FORGE v2 turns the web into an open economic system where every agent interaction is a decision, every decision has a cost, and every cost drives better outcomes.