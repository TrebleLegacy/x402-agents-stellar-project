const fs = require('fs');

const code = `import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { AgentRepository } from "./repository";
import { AgentState, IntentType, ActionType, SessionData } from "./types";
import { generateLLMDeFiData } from "../api/routes/defi.agent";
import { generateLLMArticles } from "../api/routes/news.agent";
import { generateLLMFindings } from "../api/routes/security.agent";
import { logger } from "../utils/logger";

export class AgentGraph {
  private llm: ChatOpenAI;
  private repository: AgentRepository;

  constructor(repository: AgentRepository, apiKey: string) {
    this.repository = repository;
    this.llm = new ChatOpenAI({
      temperature: 0.3,
      modelName: "gpt-4o",
      openAIApiKey: apiKey,
    });
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
    logger.info(\`[Agent] Orchestrating dynamic bidding for input: "\${state.current_input}"\`);
    
    this.pushEvent(state, 'bidding_started', 'Orchestrator requesting bids from specialized agents', { query: state.current_input });

    const systemPrompt = \`Atue como Orquestrador. O usuário solicitou: "\${state.current_input}".
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
Se for conversa genérica, defina winner como "General".\`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage("Por favor, realize a simulação de bidding.")
      ]);
      
      const content = response.content.toString();
      let bidData;
      try {
        const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
        bidData = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
      } catch (e) {
        bidData = { bids: [], winner: "General", intent: "general" };
      }

      this.pushEvent(state, 'bidding_completed', \`Bidding finished. Winner: \${bidData.winner}\`, bidData);

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

      logger.info(\`[Agent] Intent classified as: \${intent} (Winner: \${bidData.winner})\`);

      state.detected_intent = intent;
      state.action_type = actionType;
      return state;
    } catch (e: any) {
      logger.error(\`[Agent] Error in bidding: \${e.message}\`);
      this.pushEvent(state, 'bidding_failed', \`Error during orchestrated bidding: \${e.message}\`);
      state.detected_intent = IntentType.GENERAL;
      state.action_type = ActionType.NONE;
      return state;
    }
  }

  private async executeAction(state: AgentState): Promise<AgentState> {
    logger.info(\`[Agent] Executing action: \${state.action_type}\`);
    if (state.action_type !== ActionType.NONE) {
       this.pushEvent(state, 'action_execution_started', \`Executing specialized workflow: \${state.action_type}\`);
    }
    
    try {
      if (state.action_type === ActionType.GET_DEFI_DATA) {
        const extractionPrompt = \`Extraia o "protocol" e a "metric" da frase do usuário. Apenas retorne JSON. Se não houver protocolo explícito mas sim "defi", use protocolo "Geral".\`;
        const schema = z.object({ protocol: z.string(), metric: z.string() });
        const obj = await this.llm.withStructuredOutput(schema).invoke([
          new SystemMessage(extractionPrompt),
          new HumanMessage(state.current_input)
        ]);
        
        const data = await generateLLMDeFiData(obj.protocol, obj.metric);
        state.action_params = { result: data };
        state.success = true;
        this.pushEvent(state, 'action_execution_completed', \`DeFi data extracted\`, { payload: obj, result: data });
      }
      else if (state.action_type === ActionType.GET_NEWS) {
        const extractionPrompt = \`Extraia a "category" (categoria) e o "limit" (número de artigos, entre 1-5). Apenas JSON.\`;
        const schema = z.object({ category: z.string(), limit: z.number().max(5) });
        const obj = await this.llm.withStructuredOutput(schema).invoke([
          new SystemMessage(extractionPrompt),
          new HumanMessage(state.current_input)
        ]);
        
        const data = await generateLLMArticles(obj.category, obj.limit);
        state.action_params = { result: data };
        state.success = true;
        this.pushEvent(state, 'action_execution_completed', \`News data fetched\`, { payload: obj, count: obj.limit });
      }
      else if (state.action_type === ActionType.GET_SECURITY_AUDIT) {
        const extractionPrompt = \`Extraia o alvo ("target") e tipo de scan ("scanType"). Apenas JSON.\`;
        const schema = z.object({ target: z.string(), scanType: z.string() });
        const obj = await this.llm.withStructuredOutput(schema).invoke([
          new SystemMessage(extractionPrompt),
          new HumanMessage(state.current_input)
        ]);
        
        const data = await generateLLMFindings(obj.target, obj.scanType);
        state.action_params = { result: data };
        state.success = true;
        this.pushEvent(state, 'action_execution_completed', \`Security findings generated\`, { payload: obj });
      } else {
        state.success = true;
      }
      
      return state;
    } catch (e: any) {
      logger.error(\`[Agent] Action error: \${e.message}\`);
      this.pushEvent(state, 'action_execution_failed', \`Action execution failed: \${e.message}\`);
      state.success = false;
      state.error = e.message;
      return state;
    }
  }

  private async generateResponse(state: AgentState): Promise<AgentState> {
    logger.info(\`[Agent] Generating final response...\`);
    
    if (!state.success && state.error) {
      state.response_message = \`Ocorreu um erro ao processar sua solicitação: \${state.error}\`;
      return state;
    }

    if (state.action_type === ActionType.NONE || state.detected_intent === IntentType.GENERAL) {
      const response = await this.llm.invoke([
        new SystemMessage("Você é o AgentGraph. Responda educadamente de forma concisa e direta, informando que nenhuma action direcionada foi detectada (General)."),
        new HumanMessage(state.current_input)
      ]);
      state.response_message = response.content.toString();
      state.success = true;
      return state;
    }

    if (state.action_params?.result) {
      const resultObj = state.action_params.result;
      const formatPrompt = \`Você é um agente. O sistema analisou ou buscou dados brutos JSON da API externa. Responda ao usuário referenciando esses dados contextualmente para construir sua resposta:\\n\\n\${JSON.stringify(resultObj, null, 2)}\`;
      const response = await this.llm.invoke([
        new SystemMessage(formatPrompt),
        new HumanMessage(state.current_input)
      ]);

      state.response_message = response.content.toString();
      state.success = true;
      return state;
    }

    state.response_message = "Não foi possível concluir a operação.";
    state.success = false;
    return state;
  }

  async processInput(initialState: AgentState): Promise<AgentState> {
    try {
      if (!initialState.networkEvents) initialState.networkEvents = [];
      let state = await this.orchestrateBidding(initialState);
      state = await this.executeAction(state);
      state = await this.generateResponse(state);
      
      // Save messages & state
      await this.repository.saveMessage(state.session_id, "user", state.current_input);
      await this.repository.saveMessage(state.session_id, "assistant", state.response_message);
      await this.repository.saveState(state.session_id, state);
      
      return state;
    } catch (error: any) {
      logger.error(\`[GraphExecutionError] \${error.message}\`);
      initialState.success = false;
      initialState.error = error.message;
      initialState.response_message = "Desculpe, ocorreu um erro interno na orquestração dos agentes.";
      this.pushEvent(initialState, 'fatal_error', error.message);
      return initialState;
    }
  }
}
`;

fs.writeFileSync('/home/rodrigodog/x402-agents-stellar-project/backend/src/agents/graph.ts', code);
