/**
 * Stellar Blockchain Tools for TalkToStellar Agent
 * Functions that the LLM can call to perform blockchain operations
 */

import { z } from "zod";
import { StellarClient } from "../stellar/client";
import { UserService } from "../api/services/user.service";
import { logger } from "../utils/logger";
import { supabase } from "../config/supabase";
import { apiTools, executeNetworkTool } from "../api/routes/network";

const mappedNetworkTools = apiTools.map(t => ({
  name: t.id,
  description: `${t.description} (Cost: ${t.pricing})`,
  parameters: {
    type: "object",
    properties: Object.keys(t.params || {}).reduce((acc, key) => {
      acc[key] = { type: t.params![key] || "string", description: `Parameter ${key}` };
      return acc;
    }, {} as Record<string, any>),
    required: Object.keys(t.params || {}),
  }
}));

/**
 * Tool definitions for OpenAI function calling
 */
export const toolDefinitions = [
  ...mappedNetworkTools,
  {
    name: "create_wallet",
    description: "Create a new Stellar wallet or link an existing public key to the user account",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Wallet display name",
        },
        email: {
          type: "string",
          description: "User's email address",
        },
        phone_number: {
          type: "string",
          description: "User's phone number",
        },
        public_key: {
          type: "string",
          description: "Existing Stellar public key to link",
        },
        secret_key: {
          type: "string",
          description: "Existing Stellar private key (secret) to import/login wallet",
        },
      },
      required: [],
    },
  },
  {
    name: "get_balance",
    description: "Get the XLM balance of a Stellar account",
    parameters: {
      type: "object",
      properties: {
        public_key: {
          type: "string",
          description: "Stellar public key to check balance for",
        },
      },
      required: ["public_key"],
    },
  },
  {
    name: "get_account",
    description: "Get detailed information about a Stellar account including all asset balances",
    parameters: {
      type: "object",
      properties: {
        public_key: {
          type: "string",
          description: "Stellar public key to look up",
        },
      },
      required: ["public_key"],
    },
  },
  {
    name: "build_payment",
    description: "Build a Stellar payment transaction (XDR format). Must be signed and submitted separately.",
    parameters: {
      type: "object",
      properties: {
        source_public_key: {
          type: "string",
          description: "Your Stellar public key (sender)",
        },
        destination: {
          type: "string",
          description: "Destination Stellar public key (receiver)",
        },
        amount: {
          type: "string",
          description: "Amount of XLM to send (e.g., '10.5')",
        },
        memo: {
          type: "string",
          description: "Optional memo for the transaction",
        },
      },
      required: ["source_public_key", "destination", "amount"],
    },
  },
  {
    name: "submit_transaction",
    description: "Submit a signed transaction to the Stellar network",
    parameters: {
      type: "object",
      properties: {
        signed_xdr: {
          type: "string",
          description: "Signed transaction in XDR format",
        },
      },
      required: ["signed_xdr"],
    },
  },
  {
    name: "get_transaction_history",
    description: "Get recent transaction history for a Stellar account",
    parameters: {
      type: "object",
      properties: {
        public_key: {
          type: "string",
          description: "Stellar public key to get history for",
        },
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default 10)",
        },
      },
      required: ["public_key"],
    },
  },
  {
    name: "add_contact",
    description: "Add a new contact with their Stellar public key",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "Your user ID",
        },
        contact_name: {
          type: "string",
          description: "Name for the contact",
        },
        public_key: {
          type: "string",
          description: "Contact's Stellar public key",
        },
      },
      required: ["user_id", "contact_name", "public_key"],
    },
  },
  {
    name: "list_contacts",
    description: "Get all saved contacts for the user",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "Your user ID",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "list_wallets_and_contacts",
    description: "List all wallets with wallet name and related contacts",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

const isMissingTableError = (error: any): boolean => {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('could not find the table') || (message.includes('relation') && message.includes('does not exist'));
};

/**
 * Execute a tool function
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  try {
    const isNetworkTool = apiTools.some(t => t.id === toolName);
    if (isNetworkTool) {
      const data = await executeNetworkTool(toolName, toolInput);
      logger.info(`Called Network Tool: ${toolName} -> Paid x402 automatically.`);
      return JSON.stringify({ success: true, data });
    }

    switch (toolName) {
      case "create_wallet":
        return await executeCreateWallet(toolInput);
      case "get_balance":
        return await executeGetBalance(toolInput);
      case "get_account":
        return await executeGetAccount(toolInput);
      case "build_payment":
        return await executeBuildPayment(toolInput);
      case "submit_transaction":
        return await executeSubmitTransaction(toolInput);
      case "get_transaction_history":
        return await executeGetHistory(toolInput);
      case "add_contact":
        return await executeAddContact(toolInput);
      case "list_contacts":
        return await executeListContacts(toolInput);
      case "list_wallets_and_contacts":
        return await executeListWalletsAndContacts();
      default:
        return JSON.stringify({
          success: false,
          error: `Unknown tool: ${toolName}`,
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Tool execution error in ${toolName}: ${errorMessage}`);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: Create Wallet
 */
async function executeCreateWallet(input: any): Promise<string> {
  try {
    logger.debug("Tool: Creating wallet/account");
    const result = await UserService.onboardUser({
      name: input.name,
      email: input.email,
      phoneNumber: input.phone_number,
      publicKey: input.public_key,
      secretKey: input.secret_key,
    });
    return JSON.stringify({
      success: true,
      user_id: result.userId,
      public_key: result.publicKey,
      secret_key: result.secretKey,
      message: result.secretKey
        ? "Account created successfully! Save your secret key in a secure place."
        : "Account linked successfully!",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: Get Balance
 */
async function executeGetBalance(input: any): Promise<string> {
  try {
    logger.debug(`Tool: Getting balance for ${input.public_key}`);
    const balance = await StellarClient.getBalance(input.public_key);
    return JSON.stringify({
      success: true,
      balance,
      asset: "XLM",
      message: `Account balance: ${balance} XLM`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: Get Account
 */
async function executeGetAccount(input: any): Promise<string> {
  try {
    logger.debug(`Tool: Getting account details for ${input.public_key}`);
    const account = await StellarClient.getAccount(input.public_key);
    const balances = account.balances.map((b: any) => ({
      asset: b.asset_code || "XLM",
      balance: b.balance,
      type: b.asset_type,
    }));
    return JSON.stringify({
      success: true,
      account_id: account.id,
      sequence: account.sequence,
      balances,
      message: "Account details retrieved",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: Build Payment
 */
async function executeBuildPayment(input: any): Promise<string> {
  try {
    logger.debug(`Tool: Building payment from ${input.source_public_key} to ${input.destination}`);
    const xdr = await StellarClient.buildPaymentXdr({
      sourcePublicKey: input.source_public_key,
      destination: input.destination,
      amount: input.amount,
      memoText: input.memo,
    });
    return JSON.stringify({
      success: true,
      xdr,
      message: `Payment transaction built: ${input.amount} XLM to ${input.destination}. Must be signed and submitted.`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: Submit Transaction
 */
async function executeSubmitTransaction(input: any): Promise<string> {
  try {
    logger.debug("Tool: Submitting signed transaction");
    const txHash = await StellarClient.submitTransaction(input.signed_xdr);
    return JSON.stringify({
      success: true,
      transaction_hash: txHash,
      message: `Transaction submitted successfully! Hash: ${txHash}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: Get History
 */
async function executeGetHistory(input: any): Promise<string> {
  try {
    logger.debug(`Tool: Getting transaction history for ${input.public_key}`);
    const operations = await StellarClient.getOperationHistory(
      input.public_key,
      input.limit || 10
    );
    const formattedOps = operations.map((op: any) => ({
      type: op.type,
      date: op.created_at,
      hash: op.transaction_hash,
      source: op.source_account,
    }));
    return JSON.stringify({
      success: true,
      transaction_count: operations.length,
      transactions: formattedOps,
      message: `Found ${operations.length} transactions`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: Add Contact
 */
async function executeAddContact(input: any): Promise<string> {
  try {
    logger.debug(`Tool: Adding contact ${input.contact_name}`);
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: input.user_id,
        contact_name: input.contact_name,
        public_key: input.public_key,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return JSON.stringify({
      success: true,
      contact: data,
      message: `Contact "${input.contact_name}" added successfully!`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: List Contacts
 */
async function executeListContacts(input: any): Promise<string> {
  try {
    logger.debug(`Tool: Listing contacts from wallets table for user ${input.user_id}`);
    let wallets = null;
    let walletsError = null;
    
    try {
      const result = await supabase
        .from("wallets")
        .select("id, name, public_key, session_id, created_at")
        .order("created_at", { ascending: false });
      wallets = result.data;
      walletsError = result.error;
    } catch (err: any) {
      walletsError = err;
    }

    if (walletsError && !isMissingTableError(walletsError)) {
      throw new Error(walletsError.message || "Failed to fetch wallets");
    }

    if (!walletsError && wallets) {
      const sessionIds = (wallets || []).map((w: any) => w.session_id).filter(Boolean);
      const { data: sessions } = await supabase
        .from("agent_sessions")
        .select("session_id, user_id, email")
        .in("session_id", sessionIds);

      const sessionById = new Map<string, any>();
      (sessions || []).forEach((s: any) => sessionById.set(s.session_id, s));

      const normalizedContacts = (wallets || [])
        .filter((w: any) => {
          if (!input.user_id) return true;
          const owner = sessionById.get(w.session_id);
          return owner?.user_id !== input.user_id;
        })
        .map((w: any, idx: number) => ({
          ...(() => {
            const owner = sessionById.get(w.session_id);
            const emailName = owner?.email ? String(owner.email).split("@")[0] : undefined;
            return {
              id: w.id,
              contact_name: w.name || emailName || `wallet_${idx + 1}`,
              public_key: w.public_key,
            };
          })(),
        }));

      return JSON.stringify({
        success: true,
        contact_count: normalizedContacts.length,
        contacts: normalizedContacts,
        message: `Found ${normalizedContacts.length} wallet contacts`,
      });
    }

    let contacts = null;
    let contactsError = null;

    try {
      const result = await supabase
        .from("contacts")
        .select("*");
      contacts = result.data;
      contactsError = result.error;
    } catch (err: any) {
      contactsError = err;
    }

    if (contactsError && !isMissingTableError(contactsError)) {
      throw new Error(contactsError.message || "Failed to fetch contacts");
    }

    const normalizedContacts = (contacts || [])
      .filter((contact: any) => {
        if (!input.user_id) return true;
        return contact.owner_id === input.user_id || contact.user_id === input.user_id;
      })
      .map((contact: any, idx: number) => ({
        id: contact.id || `${idx + 1}`,
        contact_name: contact.contact_name || contact.name || `contact_${idx + 1}`,
        public_key: contact.stellar_public_key || contact.public_key,
      }));

    return JSON.stringify({
      success: true,
      contact_count: normalizedContacts.length,
      contacts: normalizedContacts,
      message: normalizedContacts.length ? `Found ${normalizedContacts.length} contacts` : "No contacts found",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Tool: List Wallets and Contacts
 */
async function executeListWalletsAndContacts(): Promise<string> {
  try {
    logger.debug("Tool: Listing all wallets with contacts");

    let wallets = null;
    let walletsError = null;

    try {
      const result = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: false });
      wallets = result.data;
      walletsError = result.error;
    } catch (err: any) {
      walletsError = err;
    }

    if (walletsError && !isMissingTableError(walletsError)) {
      throw new Error(walletsError.message);
    }

    if (!wallets || wallets.length === 0) {
      return JSON.stringify({
        success: true,
        wallet_count: 0,
        wallets: [],
        message: "No wallets found",
      });
    }

    const sessionIds = wallets.map((w: any) => w.session_id).filter(Boolean);

    const { data: sessions, error: sessionsError } = await supabase
      .from("agent_sessions")
      .select("session_id, user_id, email, phone_number")
      .in("session_id", sessionIds);

    if (sessionsError) {
      throw new Error(sessionsError.message);
    }

    const sessionById = new Map<string, any>();
    (sessions || []).forEach((s: any) => sessionById.set(s.session_id, s));

    let contacts: any[] = [];
    try {
      const { data: contactsByOwner, error: contactsOwnerError } = await supabase
        .from("contacts")
        .select("*");

      if (!contactsOwnerError) {
        contacts = contactsByOwner || [];
      }
    } catch {
      // Ignora erro se 'contacts' tabela não existir
    }

    const formattedWallets = wallets.map((wallet: any, index: number) => {
      const session = sessionById.get(wallet.session_id);
      const walletName = wallet.name ||
        (session?.email ? String(session.email).split("@")[0] : undefined) ||
        `wallet_${index + 1}`;

      const relatedContacts = contacts.filter((c: any) => {
        if (session?.user_id) {
          return c.owner_id === session.user_id || c.user_id === session.user_id;
        }
        return false;
      }).map((c: any) => ({
        id: c.id,
        name: c.contact_name,
        public_key: c.stellar_public_key || c.public_key,
      }));

      return {
        name: walletName,
        public_key: wallet.public_key,
        session_id: wallet.session_id,
        user_id: session?.user_id,
        email: session?.email,
        phone_number: session?.phone_number,
        balance: wallet.balance || [],
        contact_count: relatedContacts.length,
        contacts: relatedContacts,
      };
    });

    return JSON.stringify({
      success: true,
      wallet_count: formattedWallets.length,
      wallets: formattedWallets,
      message: `Found ${formattedWallets.length} wallets with contacts`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * All available tools for export
 */
export const ALL_TOOLS = toolDefinitions.map(t => ({
  type: "function",
  function: t
}));

