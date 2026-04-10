/**
 * Budget Manager + Dynamic Pricing Engine
 * Manages task budgets and adaptive pricing based on reputation and demand
 */

export interface TaskBudget {
  taskId: string;
  initialBudget: number;
  spent: number;
  remaining: number;
  deployedAgents: string[];
  createdAt: Date;
}

export interface DynamicPrice {
  agentAddress: string;
  basePrice: number;
  reputationMultiplier: number;
  demandMultiplier: number;
  finalPrice: number;
  timestamp: Date;
}

export class BudgetManager {
  private budgets: Map<string, TaskBudget> = new Map();

  createBudget(taskId: string, initialBudget: number): TaskBudget {
    const budget: TaskBudget = {
      taskId,
      initialBudget,
      spent: 0,
      remaining: initialBudget,
      deployedAgents: [],
      createdAt: new Date(),
    };
    this.budgets.set(taskId, budget);
    return budget;
  }

  spendBudget(taskId: string, amount: number, agentAddress: string): { allowed: boolean; reason: string } {
    const budget = this.budgets.get(taskId);
    if (!budget) {
      return { allowed: false, reason: 'Budget not found' };
    }

    if (amount > budget.remaining) {
      return { allowed: false, reason: `Insufficient budget. Remaining: ${budget.remaining}` };
    }

    budget.spent += amount;
    budget.remaining -= amount;
    if (!budget.deployedAgents.includes(agentAddress)) {
      budget.deployedAgents.push(agentAddress);
    }

    return { allowed: true, reason: 'Budget deducted' };
  }

  getBudget(taskId: string): TaskBudget | undefined {
    return this.budgets.get(taskId);
  }

  getRemainingBudget(taskId: string): number {
    return this.budgets.get(taskId)?.remaining ?? 0;
  }
}

export class DynamicPricingEngine {
  /**
   * Calculate agent price based on reputation and demand
   */
  calculatePrice(
    basePrice: number,
    trustScore: number, // 0-100
    successRate: number, // 0-1
    demandLevel: number // 0-1 (0=low demand, 1=high demand)
  ): DynamicPrice {
    // Reputation multiplier: 0.5x at trust score 0, 1.5x at trust score 100
    const reputationMultiplier = 0.5 + (trustScore / 100) * 1.0;

    // Demand multiplier: 1.0x at low demand, 2.0x at high demand
    const demandMultiplier = 1.0 + demandLevel;

    // Calculate final price
    const finalPrice = basePrice * reputationMultiplier * demandMultiplier;

    return {
      agentAddress: '', // Set by caller
      basePrice,
      reputationMultiplier,
      demandMultiplier,
      finalPrice,
      timestamp: new Date(),
    };
  }

  /**
   * Rank agents by cost-efficiency (price vs reputation)
   */
  rankAgentsByEfficiency(
    agents: Array<{
      address: string;
      basePrice: number;
      trustScore: number;
      successRate: number;
    }>,
    demandLevel: number = 0.5
  ): Array<{
    address: string;
    price: number;
    efficiency: number;
    rank: number;
  }> {
    const priced = agents.map((agent) => {
      const dynamicPrice = this.calculatePrice(agent.basePrice, agent.trustScore, agent.successRate, demandLevel);
      const efficiency = agent.trustScore / (dynamicPrice.finalPrice + 0.001); // Avoid division by zero

      return {
        address: agent.address,
        price: dynamicPrice.finalPrice,
        efficiency,
      };
    });

    // Sort by efficiency descending
    priced.sort((a, b) => b.efficiency - a.efficiency);

    // Add ranks
    return priced.map((p, idx) => ({
      ...p,
      rank: idx + 1,
    }));
  }
}
