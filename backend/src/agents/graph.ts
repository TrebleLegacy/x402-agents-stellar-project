import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { AgentRepository } from "./repository";
import { AgentState, IntentType, ActionType, SessionData, AgentConfig } from "./types";
import { generateLLMDeFiData } from "../api/routes/defi.agent";
import { generateLLMArticles } from "../api/routes/news.agent";
import { generateLLMFindings } from "../api/routes/security.agent";
import { logger } from "../utils/logger";

export class AgentGraph {
  private llm: ChatOpenAI;
  private repository: AgentRepository;
  private apiKey: string;
  private agentConfig?: AgentConfig;

  constructor(repository: AgentRepository, apiKey: string, agentConfig?: AgentConfig) {
    this.repository = repository;
    this.apiKey = apiKey;
    this.agentConfig = agentConfig;
    this.llm = this.createLLM(agentConfig);
  }

  private createLLM(agentConfig?: AgentConfig): ChatOpenAI {
    return new ChatOpenAI({
      temperature: agentConfig?.temperature ?? 0,
      modelName: agentConfig?.model || "gpt-4o",
      maxTokens: agentConfig?.maxTokens,
      openAIApiKey: this.apiKey,
    });
  }

  private buildSystemPrompt(state: AgentState, fallback: string): string {
    const custom = state.agent_config?.systemPrompt?.trim();
    if (custom) {
      return `${custom}\n\n${fallback}`;
    }
    return fallback;
  }

  private pushEvent(state: AgentState, stage: string, detail: string, payload?: any) {
    if (!state.networkEvents) state.networkEvents = [];
    state.networkEvents.push({
      at: new Date().toISOString(),
      source: 'forge',
      stage,
      detail,
      payload
    });
  }

  private async orchestrateBidding(state: AgentState): Promise<AgentState> {
    logger.info(`[Agent] Orchestrating dynamic bidding for input: "${state.current_input}"`);
    
    this.pushEvent(state, 'bidding_started', 'Orchestrator requesting bids from specialized agents', { query: state.current_input });

    const systemPrompt = `Atue como Orquestrador. O usuário solicitou: "${state.current_input}".
Temos três agentes: DeFi (TVL, Uniswap, rendimentos), News (notícias de blockchain, mercados), Security (auditoria, scans).
Gere uma simulação JSON de um 'bidding', contendo os bids dos agentes.
Formato:
{
  "bids": [
    { "agent": "DeFi Agent", "confidence": <num 0-100>, "latencyMs": <num>, "costXlm": <num> },
    ...
  ],
  "winner": "<Nome do agente com maior confidence>",
  "intent": "<defi|news|security|general>"
}
Se for conversa genérica, defina winner como "General".`;

    try {
      this.pushEvent(state, 'llm_invoked', 'LLM bidding simulation started', {
        model: this.agentConfig?.model || 'gpt-4o',
        temperature: this.agentConfig?.temperature ?? 0,
      });
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage("Por favor, realize a simulação de bidding.")
      ]);
      
      const content = response.content.toString();
      let bidData;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        bidData = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
      } catch (e) {
        bidData = { bids: [], winner: "General", intent: "general" };
      }

      this.pushEvent(state, 'bidding_completed', `Bidding finished. Winner: ${bidData.winner}`, bidData);

      let intent = IntentType.GENERAL;
      let actionType = ActionType.NONE;

      const actIntent = bidData.intent?.toLowerCase() || '';

      if (actIntent.includes("defi")) {
        intent = IntentType.DEFI;
        actionType = ActionType.GET_DEFI_DATA;
      } else if (actIntent.includes("news")) {
        intent = IntentType.NEWS;
        actionType = ActionType.GET_NEWS;
      } else if (actIntent.includes("security")) {
        intent = IntentType.SECURITY;
        actionType = ActionType.GET_SECURITY_AUDIT;
      }

      logger.info(`[Agent] Intent classified as: ${intent} (Winner: ${bidData.winner})`);

      state.detected_intent = intent;
      state.action_type = actionType;
      return state;
    } catch (e: any) {
      logger.error(`[Agent] Error in bidding: ${e.message}`);
      this.pushEvent(state, 'bidding_failed', `Error during orchestrated bidding: ${e.message}`);
      state.detected_intent = IntentType.GENERAL;
      state.action_type = ActionType.NONE;
      return state;
    }
  }

  private async executeAction(state: AgentState): Promise<AgentState> {
    logger.info(`[Agent] Executing action: ${state.action_type}`);
    if (state.action_type !== ActionType.NONE) {
       this.pushEvent(state, 'action_execution_started', `Executing specialized workflow: ${state.action_type}`);
    }
    
    try {
      if (state.action_type === ActionType.GET_DEFI_DATA) {
        const extractionPrompt = `Extraia o "protocol" e a "metric" da frase do usuário. Apenas retorne JSON. Se não houver protocolo explícito mas sim "defi", use protocolo "Geral".`;
        const schema = z.object({ protocol: z.string(), metric: z.string() });
        this.pushEvent(state, 'llm_invoked', 'LLM parameter extraction started', { purpose: 'defi_params' });
        const obj = await this.llm.withStructuredOutput(schema).invoke([
          new SystemMessage(extractionPrompt),
          new HumanMessage(state.current_input)
        ]);
        
        const data = await generateLLMDeFiData(obj.protocol, obj.metric);
        state.action_params = { result: data };
        state.success = true;
        this.pushEvent(state, 'action_execution_completed', `DeFi data extracted`, { payload: obj, result: data });
        this.pushEvent(state, 'tool_result', 'DeFi tool reasoning captured', {
          protocol: obj.protocol,
          metric: obj.metric,
          reasoning: data.reasoning,
        });
      }
      else if (state.action_type === ActionType.GET_NEWS) {
        const extractionPrompt = `Extraia a "category" (categoria) e o "limit" (número de artigos, entre 1-5). Apenas JSON.`;
        const schema = z.object({ category: z.string(), limit: z.number().max(5) });
        this.pushEvent(state, 'llm_invoked', 'LLM parameter extraction started', { purpose: 'news_params' });
        const obj = await this.llm.withStructuredOutput(schema).invoke([
          new SystemMessage(extractionPrompt),
          new HumanMessage(state.current_input)
        ]);
        
        const data = await generateLLMArticles(obj.category, obj.limit);
        state.action_params = { result: data };
        state.success = true;
        this.pushEvent(state, 'action_execution_completed', `News data fetched`, { payload: obj, count: obj.limit });
        this.pushEvent(state, 'tool_result', 'News tool reasoning captured', {
          category: obj.category,
          limit: obj.limit,
          reasoning: data.reasoning,
        });
      }
      else if (state.action_type === ActionType.GET_SECURITY_AUDIT) {
        const extractionPrompt = `Extraia o alvo ("target") e tipo de scan ("scanType"). Apenas JSON.`;
        const schema = z.object({ target: z.string(), scanType: z.string() });
        this.pushEvent(state, 'llm_invoked', 'LLM parameter extraction started', { purpose: 'security_params' });
        const obj = await this.llm.withStructuredOutput(schema).invoke([
          new SystemMessage(extractionPrompt),
          new HumanMessage(state.current_input)
        ]);
        
        const data = await generateLLMFindings(obj.target, obj.scanType);
        state.action_params = { result: data };
        state.success = true;
        this.pushEvent(state, 'action_execution_completed', `Security findings generated`, { payload: obj });
        this.pushEvent(state, 'tool_result', 'Security tool reasoning captured', {
          target: obj.target,
          scanType: obj.scanType,
          reasoning: data.reasoning,
        });
      } else {
        state.success = true;
      }
      
      return state;
    } catch (e: any) {
      logger.error(`[Agent] Action error: ${e.message}`);
      this.pushEvent(state, 'action_execution_failed', `Action execution failed: ${e.message}`);
      state.success = false;
      state.error = e.message;
      return state;
    }
  }

  private async generateResponse(state: AgentState): Promise<AgentState> {
    logger.info(`[Agent] Generating final response...`);
    
    if (!state.success && state.error) {
      state.response_message = `Ocorreu um erro ao processar sua solicitação: ${state.error}`;
      logger.info(`[Agent] Response set to error message: ${state.response_message.slice(0, 50)}`);
      return state;
    }

    if (state.action_type === ActionType.NONE || state.detected_intent === IntentType.GENERAL) {
      this.pushEvent(state, 'llm_invoked', 'LLM response generation started', { purpose: 'general_response' });
      const response = await this.llm.invoke([
        new SystemMessage(this.buildSystemPrompt(state, "Você é o AgentGraph. Responda educadamente de forma concisa e direta, informando que nenhuma action direcionada foi detectada (General).")),
        new HumanMessage(state.current_input)
      ]);
      state.response_message = response.content.toString();
      logger.info(`[Agent] General response generated: "${state.response_message.slice(0, 100)}"`);
      state.success = true;
      return state;
    }

    if (state.action_params?.result) {
      const resultObj = state.action_params.result;
      const formatPrompt = `Você é um agente. O sistema analisou ou buscou dados brutos JSON da API externa. Responda ao usuário referenciando esses dados contextualmente para construir sua resposta:\n\n${JSON.stringify(resultObj, null, 2)}`;
      this.pushEvent(state, 'llm_invoked', 'LLM response generation started', { purpose: 'tool_response' });
      const response = await this.llm.invoke([
        new SystemMessage(this.buildSystemPrompt(state, formatPrompt)),
        new HumanMessage(state.current_input)
      ]);

      state.response_message = response.content.toString();
      logger.info(`[Agent] Tool response generated: "${state.response_message.slice(0, 100)}"`);
      state.success = true;
      return state;
    }

    state.response_message = "Não foi possível concluir a operação.";
    logger.info(`[Agent] Fallback response set: "${state.response_message}"`);
    state.success = false;
    return state;
  }

  async processInput(initialState: AgentState): Promise<AgentState> {
    try {
      if (!initialState.networkEvents) initialState.networkEvents = [];
      if (initialState.agent_config) {
        this.agentConfig = initialState.agent_config;
        this.llm = this.createLLM(initialState.agent_config);
        this.pushEvent(initialState, 'agent_config_loaded', 'Agent config applied', {
          name: initialState.agent_config.name,
          model: initialState.agent_config.model,
          temperature: initialState.agent_config.temperature,
          maxTokens: initialState.agent_config.maxTokens,
        });
      }
      let state = await this.orchestrateBidding(initialState);
      state = await this.executeAction(state);
      state = await this.generateResponse(state);
      
      // Save messages & state
      await this.repository.saveMessage(state.session_id, "user", state.current_input);
      await this.repository.saveMessage(state.session_id, "assistant", state.response_message);
      await this.repository.saveState(state.session_id, state);
      
      return state;
    } catch (error: any) {
      logger.error(`[GraphExecutionError] ${error.message}`);
      initialState.success = false;
      initialState.error = error.message;
      initialState.response_message = "Desculpe, ocorreu um erro interno na orquestração dos agentes.";
      this.pushEvent(initialState, 'fatal_error', error.message);
      return initialState;
    }
  }
}
