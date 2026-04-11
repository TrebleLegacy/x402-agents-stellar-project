/**
 * Auditor Agent Service
 * Built-in auditor agents that verify outputs and score agents
 */

export interface AuditResult {
  agentAddress: string;
  taskId: string;
  outputValid: boolean;
  scoreDelta: number;
  findings: string[];
  timestamp: Date;
}

export class AuditorAgentService {
  private auditResults: Map<string, AuditResult> = new Map();

  /**
   * Audit an agent's output
   * (In production, this would validate against actual outputs)
   */
  async auditOutput(
    agentAddress: string,
    taskId: string,
    output: any
  ): Promise<AuditResult> {
    // Simple validation checks
    const findings: string[] = [];
    let isValid = true;

    if (!output) {
      findings.push('Output is empty');
      isValid = false;
    }

    if (typeof output === 'object' && Object.keys(output).length === 0) {
      findings.push('Output object is empty');
      isValid = false;
    }

    // In production: validate against expected schema, call external validator, etc.

    const result: AuditResult = {
      agentAddress,
      taskId,
      outputValid: isValid,
      scoreDelta: isValid ? 2 : -5, // Award or penalize reputation
      findings,
      timestamp: new Date(),
    };

    this.auditResults.set(`${agentAddress}-${taskId}`, result);
    return result;
  }

  /**
   * Audit agent behavior and consistency over time
   */
  auditAgentBehavior(
    agentAddress: string,
    recentInteractions: Array<{ outcome: 'success' | 'failed' | 'disputed'; latency: number }>
  ): { consistent: boolean; anomalies: string[] } {
    const anomalies: string[] = [];

    if (recentInteractions.length < 3) {
      return { consistent: true, anomalies };
    }

    // Check for failure patterns
    const failureRate = recentInteractions.filter((i) => i.outcome === 'failed').length / recentInteractions.length;
    if (failureRate > 0.5) {
      anomalies.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    // Check for latency anomalies
    const latencies = recentInteractions.map((i) => i.latency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    if (maxLatency > avgLatency * 3) {
      anomalies.push(`Extreme latency spike: ${maxLatency}ms vs avg ${avgLatency.toFixed(0)}ms`);
    }

    return {
      consistent: anomalies.length === 0,
      anomalies,
    };
  }

  /**
   * Perform dispute resolution
   */
  resolveDispute(
    orchestratorAddress: string,
    agentAddress: string,
    taskId: string,
    claimAmount: number
  ): { resolved: boolean; slashAmount: number; reason: string } {
    // In production: complex multi-agent voting, historical analysis, etc.

    // Simplified logic: if agent has no prior disputes, resolve in their favor
    const auditHistory = Array.from(this.auditResults.values()).filter((r) => r.agentAddress === agentAddress);
    const priorDisputes = auditHistory.filter((r) => r.findings.length > 0).length;

    if (priorDisputes === 0) {
      return { resolved: true, slashAmount: 0, reason: 'No prior disputes. Favor agent.' };
    } else {
      return { resolved: false, slashAmount: claimAmount * 0.5, reason: 'History of issues. Slash 50%.' };
    }
  }

  getAuditResult(agentAddress: string, taskId: string): AuditResult | undefined {
    return this.auditResults.get(`${agentAddress}-${taskId}`);
  }

  getAllAudits(): AuditResult[] {
    return Array.from(this.auditResults.values());
  }
}
