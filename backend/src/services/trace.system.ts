/**
 * Observability + Trace System
 * Provides complete visibility into agent interactions and payments
 */

export interface PaymentTrace {
  id: string;
  timestamp: Date;
  fromAgent: string;
  toAgent: string;
  amount: number;
  asset: string;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  reason?: string;
}

export interface DecisionTrace {
  id: string;
  timestamp: Date;
  orchestratorId: string;
  taskId: string;
  candidates: Array<{ agentAddress: string; price: number; confidence: number }>;
  selected: string;
  reasoning: string;
}

export interface InteractionTrace {
  id: string;
  timestamp: Date;
  taskId: string;
  agents: string[];
  payments: PaymentTrace[];
  decisions: DecisionTrace[];
  status: 'pending' | 'completed' | 'failed';
  totalCost: number;
  outputs?: Record<string, any>;
}

export interface TraceGraph {
  nodes: Array<{ id: string; type: 'agent' | 'task'; label: string }>;
  edges: Array<{ from: string; to: string; label: string; payment?: number }>;
  timestamp: Date;
}

export class TraceSystem {
  private paymentTraces: Map<string, PaymentTrace> = new Map();
  private interactionTraces: Map<string, InteractionTrace> = new Map();
  private decisionTraces: Map<string, DecisionTrace> = new Map();

  recordPayment(payment: PaymentTrace): void {
    this.paymentTraces.set(payment.id, payment);
  }

  recordDecision(decision: DecisionTrace): void {
    this.decisionTraces.set(decision.id, decision);
  }

  recordInteraction(interaction: InteractionTrace): void {
    this.interactionTraces.set(interaction.id, interaction);
  }

  getInteractionTrace(taskId: string): InteractionTrace | undefined {
    return this.interactionTraces.get(taskId);
  }

  getPaymentTrace(txHash: string): PaymentTrace | undefined {
    return Array.from(this.paymentTraces.values()).find((p) => p.txHash === txHash);
  }

  /**
   * Generate a visual interaction graph for the UI
   */
  generateInteractionGraph(taskId: string): TraceGraph {
    const interaction = this.interactionTraces.get(taskId);
    if (!interaction) {
      return { nodes: [], edges: [], timestamp: new Date() };
    }

    const nodes: TraceGraph['nodes'] = [
      { id: `task-${taskId}`, type: 'task', label: `Task: ${taskId.slice(0, 8)}...` },
      ...interaction.agents.map((agent) => ({
        id: agent,
        type: 'agent' as const,
        label: `Agent: ${agent.slice(0, 8)}...`,
      })),
    ];

    const edges: TraceGraph['edges'] = interaction.payments.map((payment) => ({
      from: payment.fromAgent,
      to: payment.toAgent,
      label: `${payment.amount} ${payment.asset}`,
      payment: payment.amount,
    }));

    return {
      nodes,
      edges,
      timestamp: new Date(),
    };
  }

  /**
   * Generate a structured audit trail
   */
  getAuditTrail(taskId: string): Record<string, any> {
    const interaction = this.interactionTraces.get(taskId);
    if (!interaction) return {};

    return {
      taskId,
      timestamp: interaction.timestamp,
      status: interaction.status,
      totalCost: interaction.totalCost,
      agents: interaction.agents,
      paymentCount: interaction.payments.length,
      payments: interaction.payments.map((p) => ({
        from: p.fromAgent,
        to: p.toAgent,
        amount: p.amount,
        asset: p.asset,
        txHash: p.txHash,
        status: p.status,
      })),
      decisions: interaction.decisions.map((d) => ({
        selected: d.selected,
        reasoning: d.reasoning,
        candidates: d.candidates,
      })),
      outputs: interaction.outputs,
    };
  }

  /**
   * Get all interactions for an agent
   */
  getAgentInteractions(agentAddress: string): InteractionTrace[] {
    return Array.from(this.interactionTraces.values()).filter((i) => i.agents.includes(agentAddress));
  }

  /**
   * Get total economic activity
   */
  getNetworkStats(): {
    totalPayments: number;
    totalValue: number;
    totalInteractions: number;
    averageInteractionCost: number;
  } {
    const payments = Array.from(this.paymentTraces.values());
    const interactions = Array.from(this.interactionTraces.values());

    const totalValue = payments.reduce((sum, p) => sum + p.amount, 0);
    const avgCost = interactions.length > 0 ? totalValue / interactions.length : 0;

    return {
      totalPayments: payments.length,
      totalValue,
      totalInteractions: interactions.length,
      averageInteractionCost: avgCost,
    };
  }
}
