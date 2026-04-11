import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentRepository } from "./repository";
import { AgentGraph } from "./graph";
import { AgentState, IntentType, ActionType } from "./types";
import { requirePayment } from "../api/middlewares/requirePayment";
import { logger } from "../utils/logger";

const router = Router();
const repository = new AgentRepository();

router.post("/session", async (req: Request, res: Response) => {
  try {
    const agentConfig = req.body || {};
    const session_token = uuidv4();

    await repository.saveSession(session_token, {
      session_token,
      user_id: "anonymous",
      email: "",
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    });

    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    }

    const llm = new ChatOpenAI({
      temperature: agentConfig?.temperature ?? 0,
      modelName: agentConfig?.model || "gpt-4o",
      maxTokens: agentConfig?.maxTokens,
      openAIApiKey: apiKey,
    });

    const systemPrompt = (agentConfig?.systemPrompt || `You are ${agentConfig?.name || "an agent"}.`).trim();
    const bootPrompt = `Initialize and confirm readiness${agentConfig?.description ? ` for ${agentConfig.description}` : ""}. Provide a short greeting.`;
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(bootPrompt),
    ]);

    const boot_message = response.content.toString();
    if (boot_message) {
      await repository.saveMessage(session_token, "assistant", boot_message);
    }

    return res.json({ session_id: session_token, boot_message });
  } catch (error: any) {
    logger.error(`Error creating agent session: ${error}`);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

router.post(["/chat", "/query"], requirePayment as any, async (req: Request, res: Response) => {
  try {
    const message = req.body.message || req.body.query;
    let session_token = req.body.session_token || req.body.session_id;
    const agentConfig = req.body.agent_config || req.body.agentConfig;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    if (!session_token) {
      session_token = uuidv4();
      await repository.saveSession(session_token, {
        session_token,
        user_id: "anonymous",
        email: "",
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      });
    }

    const sessionData = await repository.getSession(session_token);
    if (!sessionData) {
      return res.status(401).json({ error: "Sessão inválida" });
    }

    const previousState = await repository.getState(session_token);
    const messages = await repository.getMessages(session_token);

    const initialState: AgentState = {
      session_id: session_token,
      session_data: sessionData,
      agent_config: agentConfig,
      messages,
      current_input: message,
      detected_intent: IntentType.GENERAL,
      action_type: ActionType.NONE,
      action_params: {},
      response_message: "",
      success: false,
    };

    const apiKey = process.env.OPENAI_API_KEY || "";
    const agentGraph = new AgentGraph(repository, apiKey, agentConfig);
    const resultState = await agentGraph.processInput(initialState);

    return res.json({
      session_token,
      session_id: session_token,
      status: resultState.success ? "success" : "error",
      success: resultState.success,
      message: resultState.response_message,
      response: {
        message: resultState.response_message,
        task: resultState.action_type,
        params: resultState.action_params,
        success: resultState.success,
        networkEvents: resultState.networkEvents,
      },
      networkEvents: resultState.networkEvents,
      trace: resultState.networkEvents,
      debug: {
        intent: resultState.detected_intent,
        action: resultState.action_type,
        success: resultState.success,
        params: resultState.action_params,
      },
    });

  } catch (error: any) {
    logger.error(`Error processing chat route: ${error}`);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
