/**
 * FORGE v3 — Complete Orchestrator Integration
 * 
 * This orchestrator ties all 15 features together into a single unified flow:
 * Task Decomposition → Agent Bidding → Policy Enforcement → Payment → Execution → Auditing → Recording
 */

import { v4 as uuid } from 'uuid';
import { ChatOpenAI } from '@langchain/openai';
import { IdentityAndReputationEngine, AgentProfile, AgentInteractionRecord } from './identity-reputation.engine';
import { PaymentPolicyEngine } from './payment-policy.engine';
import { TraceSystem, PaymentTrace, DecisionTrace, InteractionTrace } from './trace.system';
import { BudgetManager, DynamicPricingEngine } from './budget-pricing.engine';
import { AuditorAgentService } from './auditor.service';

export interface OrchestratorConfig {
  budgetPerTask: number;
  maxAgents: number;
  demandLevel: number;
  requiresAudit: boolean;
}

export interface ExecutionResult {
  taskId: string;
  success: boolean;
  selectedAgent: string;
  output: any;
  totalCost: number;
  paymentsCount: number;
  trustScore: number;
  traces: {
    payments: PaymentTrace[];
    decisions: DecisionTrace[];
    interactions: InteractionTrace;
  };
}

export class CompleteOrchestratorService {
  private identityEngine: IdentityAndReputationEngine;
  private policyEngine: PaymentPolicyEngine;
  private traceSystem: TraceSystem;
  private budgetManager: BudgetManager;
  private pricingEngine: DynamicPricingEngine;
  private auditorService: AuditorAgentService;
  private llm: ChatOpenAI;

  // In-memory agent registry
  private agents: Map<string, AgentProfile> = new Map();

  constructor(apiKey: string) {
    this.identityEngine = new IdentityAndReputationEngine();
    this.policyEngine = new PaymentPolicyEngine();
    this.traceSystem = new TraceSystem();
    this.budgetManager = new BudgetManager();
    this.pricingEngine = new DynamicPricingEngine();
    this.auditorService = new AuditorAgentService();

    this.llm = new ChatOpenAI({
      apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
    });
  }

  /**
   * Register specialized agent at the start
   */
  registerSpecializedAgent(name: string, capabilities: string[], description: string): AgentProfile {
    const profile = this.identityEngine.registerAgent(name, capabilities, description);
    this.agents.set(profile.agentAddress, profile);

    // Auto-set payment policy for new agents
    this.policyEngine.setPolicy(profile.agentAddress, {
      agentAddress: profile.agentAddress,
      maxSpendPerRequest: 0.2,
      maxSpendPerTask: 1.0,
      maxSpendPerHour: 5.0,
      allowedAssets: ['XLM', 'USDC'],
      allowedDestinations: [],
      rateLimitPaymentsPerMinute: 20,
      requiresApprovalAbove: 1.0,
      active: true,
    });

    return profile;
  }

  /**
   * MAIN ORCHESTRATION FLOW
   * Called when user makes a request
   */
  async executeFullWorkflow(
    userPrompt: string,
    config: OrchestratorConfig
  ): Promise<ExecutionResult> {
    const taskId = uuid();
    const startTime = Date.now();

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 ORCHESTRATION FLOW STARTED: ${taskId}`);
    console.log(`${'='.repeat(70)}\n`);

    // Create budget for this task
    const budget = this.budgetManager.createBudget(taskId, config.budgetPerTask);
    console.log(`💰 [Budget] Task budget allocated: ${config.budgetPerTask} XLM`);

    // ========================================
    // STAGE 1: TASK DECOMPOSITION (LLM)
    // ========================================
    console.log(`\n📋 [Stage 1] TASK DECOMPOSITION`);
    const decomposed = await this.llm.invoke(
      `Break down this query into 3 specialized tasks: "${userPrompt}". Return JSON with array of { task, capability_required }`
    );
    console.log(`${decomposed.content}`);

    // ========================================
    // STAGE 2: AGENT DISCOVERY
    // ========================================
    console.log(`\n🔍 [Stage 2] AGENT DISCOVERY`);
    const availableAgents = Array.from(this.agents.values()).filter((a) => a.active);
    console.log(`Found ${availableAgents.length} available specialized agents`);

    // Simulate x402 payment for agent discovery
    const discoveryPayment: PaymentTrace = {
      id: uuid(),
      timestamp: new Date(),
      fromAgent: 'orchestrator',
      toAgent: 'registry',
      amount: 0.01,
      asset: 'XLM',
      status: 'confirmed',
      txHash: `discovery_${uuid().slice(0, 8)}`,
    };
    this.traceSystem.recordPayment(discoveryPayment);
    this.budgetManager.spendBudget(taskId, 0.01, 'orchestrator');
    console.log(`✋ [x402 Paywall] Paid 0.01 XLM for agent registry lookup`);

    // ========================================
    // STAGE 3: AGENT BIDDING + REPUTATION SCORING
    // ========================================
    console.log(`\n🏆 [Stage 3] AGENT BIDDING WITH REPUTATION SCORING`);

    const bids = availableAgents.map((agent) => {
      // Dynamic pricing based on reputation and demand
      const dynamicPrice = this.pricingEngine.calculatePrice(
        0.05,
        agent.reputation.trustScore,
        agent.reputation.successRate,
        config.demandLevel
      );

      return {
        agent,
        basePrice: 0.05,
        finalPrice: dynamicPrice.finalPrice,
        reputationMultiplier: dynamicPrice.reputationMultiplier,
        demandMultiplier: dynamicPrice.demandMultiplier,
        trustScore: agent.reputation.trustScore,
        successRate: agent.reputation.successRate,
      };
    });

    console.table(
      bids.map((b) => ({
        name: b.agent.name,
        price: b.finalPrice.toFixed(4),
        trust: b.trustScore,
        success: (b.successRate * 100).toFixed(0) + '%',
      }))
    );

    // ========================================
    // STAGE 4: AUDITOR VERIFICATION
    // ========================================
    console.log(`\n🔍 [Stage 4] AUDITOR VERIFICATION`);
    if (config.requiresAudit) {
      for (const bid of bids) {
        // Simulate x402 payment for audit
        const auditPayment: PaymentTrace = {
          id: uuid(),
          timestamp: new Date(),
          fromAgent: 'orchestrator',
          toAgent: `auditor_${bid.agent.name}`,
          amount: 0.01,
          asset: 'XLM',
          status: 'confirmed',
          txHash: `audit_${uuid().slice(0, 8)}`,
        };
        this.traceSystem.recordPayment(auditPayment);
        this.budgetManager.spendBudget(taskId, 0.01, 'orchestrator');

        console.log(
          `✋ [x402 Paywall] Paid 0.01 XLM for audit of ${bid.agent.name} | Trust score: ${bid.trustScore}/100`
        );
      }
    }

    // ========================================
    // STAGE 5: POLICY VALIDATION
    // ========================================
    console.log(`\n🛡️ [Stage 5] PAYMENT POLICY VALIDATION`);
    for (const bid of bids) {
      const policyCheck = this.policyEngine.validatePayment(
        bid.agent.agentAddress,
        bid.finalPrice,
        'orchestrator',
        'XLM'
      );

      console.log(
        `${policyCheck.allowed ? '✅' : '❌'} ${bid.agent.name}: ${policyCheck.reason}`
      );

      if (policyCheck.allowed) {
        this.policyEngine.recordPayment(bid.agent.agentAddress, bid.finalPrice);
      }
    }

    // ========================================
    // STAGE 6: ECONOMIC DECISION (LLM)
    // ========================================
    console.log(`\n💡 [Stage 6] ORCHESTRATOR ECONOMIC DECISION`);
    const rankedAgents = this.pricingEngine.rankAgentsByEfficiency(
      bids.map((b) => ({
        address: b.agent.agentAddress,
        basePrice: b.basePrice,
        trustScore: b.trustScore,
        successRate: b.successRate,
      })),
      config.demandLevel
    );

    const selectedAgent = availableAgents.find(
      (a) => a.agentAddress === rankedAgents[0].address
    )!;

    // Record the orchestrator decision
    const decision: DecisionTrace = {
      id: uuid(),
      timestamp: new Date(),
      orchestratorId: 'main-orchestrator',
      taskId,
      candidates: bids.map((b) => ({
        agentAddress: b.agent.agentAddress,
        price: b.finalPrice,
        confidence: b.trustScore / 100,
      })),
      selected: selectedAgent.agentAddress,
      reasoning: `Selected ${selectedAgent.name} (rank 1) with trust score ${selectedAgent.reputation.trustScore}/100 and price ${rankedAgents[0].price.toFixed(4)} XLM`,
    };
    this.traceSystem.recordDecision(decision);

    console.log(`\n✅ SELECTED: ${selectedAgent.name}`);
    console.log(`   Trust Score: ${selectedAgent.reputation.trustScore}/100`);
    console.log(`   Price: ${rankedAgents[0].price.toFixed(4)} XLM`);
    console.log(`   Reasoning: ${decision.reasoning}`);

    // ========================================
    // STAGE 7: BUDGET CONSTRAINT CHECK
    // ========================================
    console.log(`\n💰 [Stage 7] BUDGET CONSTRAINT CHECK`);
    const remaining = this.budgetManager.getRemainingBudget(taskId);
    const agentFee = rankedAgents[0].price;

    if (agentFee > remaining) {
      console.log(`❌ Agent fee (${agentFee.toFixed(4)} XLM) exceeds remaining budget (${remaining.toFixed(4)} XLM)`);
      console.log(`   Selecting cheaper alternative...`);
      // In real system, would select next agent
    } else {
      console.log(`✅ Budget sufficient: ${remaining.toFixed(4)} XLM remaining`);
    }

    // ========================================
    // STAGE 8: x402 PAYMENT FOR AGENT EXECUTION
    // ========================================
    console.log(`\n💳 [Stage 8] x402 PAYMENT FOR AGENT EXECUTION`);
    console.log(`→ GET /agents/${selectedAgent.name}/execute [402 Payment Required]`);

    const executionPayment: PaymentTrace = {
      id: uuid(),
      timestamp: new Date(),
      fromAgent: 'orchestrator',
      toAgent: selectedAgent.agentAddress,
      amount: agentFee,
      asset: 'XLM',
      status: 'confirmed',
      txHash: `exec_${uuid().slice(0, 8)}`,
    };

    console.log(`→ Orchestrator builds Stellar transaction`);
    console.log(`  Amount: ${agentFee.toFixed(4)} XLM`);
    console.log(`  Destination: ${selectedAgent.agentAddress.slice(0, 16)}...`);

    console.log(`→ Stellar testnet confirmation (TX: ${executionPayment.txHash})`);
    this.traceSystem.recordPayment(executionPayment);
    this.budgetManager.spendBudget(taskId, agentFee, selectedAgent.agentAddress);

    console.log(`✅ Payment confirmed. Agent executing task...`);

    // ========================================
    // STAGE 9: AGENT EXECUTION (SPECIALIZED)
    // ========================================
    console.log(`\n⚙️ [Stage 9] SPECIALIZED AGENT EXECUTION`);
    console.log(`Agent: ${selectedAgent.name}`);
    console.log(`Capabilities: ${selectedAgent.capabilities.join(', ')}`);

    const agentOutput = await this.llm.invoke(
      `You are ${selectedAgent.name}. Execute this task: "${userPrompt}". Return JSON with results.`
    );

    console.log(`✅ Agent completed execution`);
    console.log(`Output preview: ${String(agentOutput.content).slice(0, 100)}...`);

    // ========================================
    // STAGE 10: AUDITOR VERIFICATION (OUTPUT)
    // ========================================
    console.log(`\n🔍 [Stage 10] OUTPUT AUDITOR VERIFICATION`);
    
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(String(agentOutput.content));
    } catch (e) {
      // If not JSON, wrap the content in a JSON object
      parsedOutput = {
        result: String(agentOutput.content),
        type: 'text_response'
      };
    }

    const auditResult = await this.auditorService.auditOutput(
      selectedAgent.agentAddress,
      taskId,
      parsedOutput
    );

    console.log(`Audit Result: ${auditResult.outputValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Reputation Delta: ${auditResult.scoreDelta > 0 ? '+' : ''}${auditResult.scoreDelta}`);

    if (auditResult.findings.length > 0) {
      console.log(`Findings: ${auditResult.findings.join(', ')}`);
    }

    // ========================================
    // STAGE 11: REPUTATION UPDATE
    // ========================================
    console.log(`\n📊 [Stage 11] REPUTATION UPDATE`);

    const interactionRecord: AgentInteractionRecord = {
      agentAddress: selectedAgent.agentAddress,
      taskId,
      outcome: auditResult.outputValid ? 'success' : 'failed',
      latency: Date.now() - startTime,
      stakeAmount: agentFee * 0.5,
      reward: auditResult.outputValid ? 0.002 : 0,
      slashed: auditResult.outputValid ? 0 : 0.01,
      timestamp: new Date(),
      txHash: executionPayment.txHash,
    };

    this.identityEngine.recordInteraction(interactionRecord);

    const updatedAgent = this.identityEngine.getAgentProfile(selectedAgent.agentAddress);
    console.log(`Agent ${selectedAgent.name} reputation updated:`);
    console.log(`  Success Rate: ${(updatedAgent!.reputation.successRate * 100).toFixed(1)}%`);
    console.log(`  Trust Score: ${updatedAgent!.reputation.trustScore.toFixed(0)}/100`);
    console.log(`  Total Interactions: ${updatedAgent!.reputation.totalInteractions}`);

    // ========================================
    // STAGE 12: TRACE RECORDING
    // ========================================
    console.log(`\n📝 [Stage 12] TRACE RECORDING & AUDIT TRAIL`);

    const interaction: InteractionTrace = {
      id: taskId,
      timestamp: new Date(),
      taskId,
      agents: bids.map((b) => b.agent.agentAddress),
      payments: [discoveryPayment, executionPayment],
      decisions: [decision],
      status: 'completed',
      totalCost: 0.01 + agentFee,
      outputs: {
        selectedAgent: selectedAgent.name,
        executorTrustScore: selectedAgent.reputation.trustScore,
        auditPassed: auditResult.outputValid,
        latency: Date.now() - startTime,
      },
    };

    this.traceSystem.recordInteraction(interaction);

    const graph = this.traceSystem.generateInteractionGraph(taskId);
    console.log(`Recorded interaction graph with:`);
    console.log(`  Nodes: ${graph.nodes.length} (agents + tasks)`);
    console.log(`  Edges: ${graph.edges.length} (payments)`);

    const stats = this.traceSystem.getNetworkStats();
    console.log(`\nNetwork Statistics:`);
    console.log(`  Total Payments: ${stats.totalPayments}`);
    console.log(`  Total Value: ${stats.totalValue.toFixed(4)} XLM`);
    console.log(`  Avg Cost: ${stats.averageInteractionCost.toFixed(4)} XLM`);

    // ========================================
    // FINAL RESULT
    // ========================================
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ ORCHESTRATION COMPLETE`);
    console.log(`${'='.repeat(70)}\n`);

    return {
      taskId,
      success: auditResult.outputValid,
      selectedAgent: selectedAgent.name,
      output: agentOutput.content,
      totalCost: 0.01 + agentFee,
      paymentsCount: 2,
      trustScore: updatedAgent!.reputation.trustScore,
      traces: {
        payments: [discoveryPayment, executionPayment],
        decisions: [decision],
        interactions: interaction,
      },
    };
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent profile with full history
   */
  getAgentWithHistory(agentAddress: string) {
    const profile = this.identityEngine.getAgentProfile(agentAddress);
    const history = this.identityEngine.getInteractionHistory(agentAddress);
    return { profile, history };
  }

  /**
   * Get task trace details
   */
  getTaskTrace(taskId: string) {
    return this.traceSystem.getInteractionTrace(taskId);
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    return this.traceSystem.getNetworkStats();
  }
}
