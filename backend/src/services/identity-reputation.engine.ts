import { Keypair } from '@stellar/stellar-sdk';

/**
 * Agent Identity + Reputation Layer
 * Every agent in the network has a persistent identity and economic track record
 */

export interface AgentReputation {
  agentAddress: string;
  totalInteractions: number;
  successRate: number;
  averageLatency: number;
  totalStaked: number;
  slashesReceived: number;
  rewardsEarned: number;
  trustScore: number; // 0-100
  lastUpdated: Date;
}

export interface AgentProfile {
  agentAddress: string;
  publicKey: string;
  name: string;
  description: string;
  capabilities: string[];
  reputation: AgentReputation;
  registeredAt: Date;
  active: boolean;
}

export interface AgentInteractionRecord {
  agentAddress: string;
  taskId: string;
  outcome: 'success' | 'failed' | 'disputed';
  latency: number;
  stakeAmount: number;
  reward: number;
  slashed: number;
  timestamp: Date;
  txHash?: string;
}

export class IdentityAndReputationEngine {
  private agentProfiles: Map<string, AgentProfile> = new Map();
  private interactionHistory: Map<string, AgentInteractionRecord[]> = new Map();

  registerAgent(name: string, capabilities: string[], description: string): AgentProfile {
    const keypair = Keypair.random();
    const agentAddress = keypair.publicKey();

    const profile: AgentProfile = {
      agentAddress,
      publicKey: agentAddress,
      name,
      description,
      capabilities,
      reputation: {
        agentAddress,
        totalInteractions: 0,
        successRate: 1.0,
        averageLatency: 0,
        totalStaked: 0,
        slashesReceived: 0,
        rewardsEarned: 0,
        trustScore: 85, // New agents start at 85
        lastUpdated: new Date(),
      },
      registeredAt: new Date(),
      active: true,
    };

    this.agentProfiles.set(agentAddress, profile);
    this.interactionHistory.set(agentAddress, []);

    return profile;
  }

  getAgentProfile(agentAddress: string): AgentProfile | undefined {
    return this.agentProfiles.get(agentAddress);
  }

  recordInteraction(record: AgentInteractionRecord): void {
    const profile = this.agentProfiles.get(record.agentAddress);
    if (!profile) throw new Error(`Agent ${record.agentAddress} not found`);

    // Store interaction
    const history = this.interactionHistory.get(record.agentAddress) || [];
    history.push(record);
    this.interactionHistory.set(record.agentAddress, history);

    // Update reputation
    const reputation = profile.reputation;
    reputation.totalInteractions++;
    reputation.totalStaked += record.stakeAmount;
    reputation.rewardsEarned += record.reward;
    reputation.slashesReceived += record.slashed;

    // Recalculate metrics
    const successCount = history.filter((r) => r.outcome === 'success').length;
    reputation.successRate = successCount / reputation.totalInteractions;

    const avgLatency = history.reduce((sum, r) => sum + r.latency, 0) / reputation.totalInteractions;
    reputation.averageLatency = avgLatency;

    // Recalculate trust score (0-100)
    // Factors: success rate (50%), latency (20%), stake (20%), slashing (10%)
    const successScore = reputation.successRate * 50;
    const latencyScore = Math.max(0, (1 - reputation.averageLatency / 1000) * 20); // normalize to 1000ms
    const stakeScore = Math.min(reputation.totalStaked / 10, 20); // max 20 points
    const slashingPenalty = Math.min(reputation.slashesReceived * 2, 10); // up to -10 penalty

    reputation.trustScore = Math.min(100, Math.max(0, successScore + latencyScore + stakeScore - slashingPenalty));
    reputation.lastUpdated = new Date();
  }

  getAgentsByCapability(capability: string): AgentProfile[] {
    return Array.from(this.agentProfiles.values()).filter(
      (p) => p.active && p.capabilities.includes(capability)
    );
  }

  getTopAgentsByReputation(limit: number = 10): AgentProfile[] {
    return Array.from(this.agentProfiles.values())
      .filter((p) => p.active)
      .sort((a, b) => b.reputation.trustScore - a.reputation.trustScore)
      .slice(0, limit);
  }

  getInteractionHistory(agentAddress: string): AgentInteractionRecord[] {
    return this.interactionHistory.get(agentAddress) || [];
  }
}
