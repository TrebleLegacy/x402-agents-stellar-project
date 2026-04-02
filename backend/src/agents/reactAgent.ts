/**
 * React Agent with Tool Support
 * LangChain ReAct (Reasoning + Acting) agent for Stellar blockchain operations
 * 
 * ReAct Pattern:
 * 1. Thought: LLM reasons about what to do
 * 2. Action: LLM decides which tool to call
 * 3. Observation: Tool result is returned
 * 4. Repeat until task complete
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { Tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { StellarClient } from "../stellar/client";
import { UserService } from "../api/services/user.service";
import { executeTool, ALL_TOOLS } from "./tools";
import { logger } from "../utils/logger";
import { AgentState } from "./types";
import { AgentRepository } from "./repository";

/**
 * Create LangChain Tool objects from our tool definitions
 */
function createLangChainTools(): Tool[] {
  return [
    {
      name: "create_wallet",
      description: "Create a new Stellar wallet or link an existing public key to the user account",
      func: async (input: any) => {
        try {
          const result = await executeTool("create_wallet", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
    {
      name: "get_balance",
      description: "Get the XLM balance of a Stellar account",
      func: async (input: any) => {
        try {
          const result = await executeTool("get_balance", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
    {
      name: "get_account",
      description: "Get detailed information about a Stellar account including all asset balances",
      func: async (input: any) => {
        try {
          const result = await executeTool("get_account", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
    {
      name: "build_payment",
      description: "Build a Stellar payment transaction (XDR format). Must be signed and submitted separately.",
      func: async (input: any) => {
        try {
          const result = await executeTool("build_payment", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
    {
      name: "submit_transaction",
      description: "Sign and submit a payment transaction to the Stellar network",
      func: async (input: any) => {
        try {
          const result = await executeTool("submit_transaction", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
    {
      name: "get_operation_history",
      description: "Get transaction history for a Stellar account",
      func: async (input: any) => {
        try {
          const result = await executeTool("get_operation_history", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
    {
      name: "add_contact",
      description: "Add a new contact with Stellar public key",
      func: async (input: any) => {
        try {
          const result = await executeTool("add_contact", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
    {
      name: "list_contacts",
      description: "List all saved contacts with their Stellar public keys",
      func: async (input: any) => {
        try {
          const result = await executeTool("list_contacts", input);
          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      schema: undefined,
    },
  ] as Tool[];
}

/**
 * ReAct Agent Handler
 * Uses LangChain's ReAct agent pattern for reasoning and tool calling
 */
export class ReactAgent {
  private llm: ChatOpenAI;
  private executor: AgentExecutor;
  private repository: AgentRepository;
  private tools: Tool[];

  constructor(repository: AgentRepository, openaiApiKey: string) {
    this.repository = repository;

    // Initialize LLM
    this.llm = new ChatOpenAI({
      openAIApiKey: openaiApiKey,
      temperature: parseFloat(process.env.TEMPERATURE || "0.5"),
      modelName: process.env.OPENAI_MODEL || "gpt-4o",
      maxTokens: 2048,
    });

    // Create tools
    this.tools = createLangChainTools();

    // Create ReAct agent
    const agent = createReactAgent({
      llm: this.llm,
      tools: this.tools,
    });

    // Create executor
    this.executor = new AgentExecutor({
      agent,
      tools: this.tools,
      verbose: process.env.DEBUG_AGENT === "true",
      maxIterations: 10,
      returnIntermediateSteps: true,
    });

    logger.info("[ReactAgent] Initialized with ReAct pattern and Stellar tools");
  }

  /**
   * Process user input through ReAct agent
   * Agent will reason about which tools to call and execute them
   */
  async processInput(state: AgentState, _config?: RunnableConfig): Promise<AgentState> {
    try {
      logger.info(`[ReactAgent] Processing for session: ${state.session_id}`);

      // Save user message
      await this.repository.saveMessage(
        state.session_id,
        "user",
        state.current_input
      );

      // Build context for the agent
      const context = {
        sessionId: state.session_id,
        userId: state.session_data?.user_id,
        publicKey: state.session_data?.public_key,
        walletInfo: state.wallet_info,
      };

      // Prepare the input message
      const inputMessage = `
Session: ${state.session_id}
User Input: ${state.current_input}

${state.wallet_info ? `\nCurrentWallet Public Key: ${state.wallet_info.publicKey}` : ""}

Please help the user with their request. Use the available tools to accomplish their task.
Respond in Portuguese (Brazilian Portuguese preferred).
Do not use emojis.
Be concise and helpful.
`;

      logger.debug(`[ReactAgent] Invoking ReAct agent...`);

      // Execute agent
      const result = await this.executor.invoke({
        input: inputMessage,
        context,
      });

      // Extract response
      const responseMessage = 
        result.output || 
        (typeof result === "string" ? result : JSON.stringify(result));

      state.response_message = responseMessage;
      state.success = true;

      logger.info(`[ReactAgent] Agent responded successfully`);

      // Save assistant message
      await this.repository.saveMessage(
        state.session_id,
        "assistant",
        state.response_message
      );

      // Save state
      await this.repository.saveState(state.session_id, state);

      return state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[ReactAgent] Error: ${errorMessage}`);

      state.success = false;
      state.error = errorMessage;
      state.response_message = `Desculpe, houve um erro ao processar sua solicitação: ${errorMessage}`;

      // Save error message
      await this.repository.saveMessage(
        state.session_id,
        "assistant",
        state.response_message
      );

      return state;
    }
  }

  /**
   * Get available tools for the agent
   */
  getAvailableTools(): Tool[] {
    return this.tools;
  }

  /**
   * Get executor for advanced usage
   */
  getExecutor(): AgentExecutor {
    return this.executor;
  }

  /**
   * Invoke agent directly with custom input
   * Useful for testing or custom workflows
   */
  async invoke(input: string, context?: any): Promise<any> {
    try {
      logger.debug(`[ReactAgent] Direct invocation: ${input}`);

      const result = await this.executor.invoke({
        input,
        context: context || {},
      });

      return {
        success: true,
        output: result.output,
        intermediateSteps: result.intermediateSteps || [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[ReactAgent] Direct invocation failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * Helper: Create a test instance of ReactAgent
 */
export async function createTestReactAgent(): Promise<ReactAgent> {
  const repository = new AgentRepository();
  const apiKey = process.env.OPENAI_API_KEY || "";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  return new ReactAgent(repository, apiKey);
}

/**
 * Example usage in tests or standalone
 */
export async function testReactAgent() {
  try {
    const agent = await createTestReactAgent();

    // Test direct invocation
    const result = await agent.invoke(
      "What is the balance of account GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJsu6CNZ4NZ4KEKJGQSTE7CWGX?"
    );

    logger.info(`[Test] ReAct Agent Result: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    logger.error(`[Test] ReAct Agent test failed: ${error}`);
  }
}
