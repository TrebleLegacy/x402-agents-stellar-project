import { AgentState, SessionData } from "./types";

type StoredMessage = { role: "user" | "assistant"; content: string; created_at: number };

export class AgentRepository {
  private sessions = new Map<string, SessionData>();
  private states = new Map<string, AgentState>();
  private messages = new Map<string, StoredMessage[]>();

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.sessions.get(sessionId) || null;
  }

  async saveSession(sessionId: string, session: SessionData): Promise<void> {
    this.sessions.set(sessionId, {
      ...session,
      last_activity: new Date().toISOString(),
    });
  }

  async getState(sessionId: string): Promise<AgentState | null> {
    return this.states.get(sessionId) || null;
  }

  async saveState(sessionId: string, state: AgentState): Promise<void> {
    this.states.set(sessionId, state);
  }

  async getMessages(
    sessionId: string,
    limit?: number
  ): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
    const all = this.messages.get(sessionId) || [];
    const slice = typeof limit === "number" ? all.slice(-limit) : all;
    return slice.map(({ role, content }) => ({ role, content }));
  }

  async saveMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    const existing = this.messages.get(sessionId) || [];
    existing.push({ role, content, created_at: Date.now() });
    this.messages.set(sessionId, existing);
  }

  async deletePrivateKeyMessages(sessionId: string): Promise<void> {
    const existing = this.messages.get(sessionId) || [];
    const filtered = existing.filter(
      (message) => !/\bS[A-Z2-7]{55}\b/.test(message.content)
    );
    this.messages.set(sessionId, filtered);
  }

  async clearSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.states.delete(sessionId);
    this.messages.delete(sessionId);
  }
}
