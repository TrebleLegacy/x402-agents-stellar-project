/**
 * Payment Policy Engine
 * Enforces hard safety constraints on agent spending
 */

export interface PaymentPolicy {
  agentAddress: string;
  maxSpendPerRequest: number;
  maxSpendPerTask: number;
  maxSpendPerHour: number;
  allowedAssets: string[];
  allowedDestinations: string[];
  rateLimitPaymentsPerMinute: number;
  requiresApprovalAbove: number;
  active: boolean;
}

export interface SpendingTracker {
  agentAddress: string;
  spentThisHour: number;
  lastHourReset: Date;
  requestsSinceLastMinute: number;
  lastMinuteReset: Date;
}

export class PaymentPolicyEngine {
  private policies: Map<string, PaymentPolicy> = new Map();
  private trackers: Map<string, SpendingTracker> = new Map();

  setPolicy(agentAddress: string, policy: PaymentPolicy): void {
    this.policies.set(agentAddress, policy);

    // Initialize tracker if not present
    if (!this.trackers.has(agentAddress)) {
      this.trackers.set(agentAddress, {
        agentAddress,
        spentThisHour: 0,
        lastHourReset: new Date(),
        requestsSinceLastMinute: 0,
        lastMinuteReset: new Date(),
      });
    }
  }

  getPolicy(agentAddress: string): PaymentPolicy | undefined {
    return this.policies.get(agentAddress);
  }

  /**
   * Validate a payment attempt against the policy
   */
  validatePayment(
    agentAddress: string,
    amount: number,
    destinationAddress: string,
    assetType: string
  ): { allowed: boolean; reason: string } {
    const policy = this.policies.get(agentAddress);
    if (!policy || !policy.active) {
      return { allowed: false, reason: 'No active policy for agent' };
    }

    const tracker = this.trackers.get(agentAddress)!;

    // Check hourly spending
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (tracker.lastHourReset < hourAgo) {
      tracker.spentThisHour = 0;
      tracker.lastHourReset = now;
    }

    if (tracker.spentThisHour + amount > policy.maxSpendPerHour) {
      return { allowed: false, reason: `Exceeds hourly limit: ${policy.maxSpendPerHour}` };
    }

    // Check per-request limit
    if (amount > policy.maxSpendPerRequest) {
      return { allowed: false, reason: `Exceeds per-request limit: ${policy.maxSpendPerRequest}` };
    }

    // Check asset type
    if (!policy.allowedAssets.includes(assetType)) {
      return { allowed: false, reason: `Asset type ${assetType} not allowed` };
    }

    // Check destination
    if (policy.allowedDestinations.length > 0 && !policy.allowedDestinations.includes(destinationAddress)) {
      return { allowed: false, reason: `Destination ${destinationAddress} not whitelisted` };
    }

    // Check rate limit
    const minuteAgo = new Date(now.getTime() - 60 * 1000);
    if (tracker.lastMinuteReset < minuteAgo) {
      tracker.requestsSinceLastMinute = 0;
      tracker.lastMinuteReset = now;
    }

    if (tracker.requestsSinceLastMinute >= policy.rateLimitPaymentsPerMinute) {
      return { allowed: false, reason: `Rate limit: ${policy.rateLimitPaymentsPerMinute} payments/min` };
    }

    return { allowed: true, reason: 'All checks passed' };
  }

  /**
   * Record a successful payment
   */
  recordPayment(agentAddress: string, amount: number): void {
    const tracker = this.trackers.get(agentAddress);
    if (!tracker) return;

    tracker.spentThisHour += amount;
    tracker.requestsSinceLastMinute++;
  }

  getSpendingTracker(agentAddress: string): SpendingTracker | undefined {
    return this.trackers.get(agentAddress);
  }
}
