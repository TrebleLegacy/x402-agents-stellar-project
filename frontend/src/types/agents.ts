export interface SpecialistAgent {
  id: string;
  name: string;
  capability: string;
  endpoint: string;
  description: string;
  priceCalculator: string; // LLM prompt for calculating price
  basePrice?: string;
  icon: string;
  status: 'online' | 'offline' | 'busy';
}

export interface AgentNetworkNode {
  id: string;
  agent: SpecialistAgent;
  paymentsMade: number;
  successRate: number;
  totalValueTransferred: string;
}

export interface AgentRegistryEntry {
  agent: SpecialistAgent;
  registeredAt: string;
  discoveryRequests: number;
  averagePricing: string;
}
