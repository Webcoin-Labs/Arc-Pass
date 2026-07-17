import { createHash } from "crypto";
import { logger } from "./logger";

export interface BuilderQualitativeAnalysis {
  githubSummary: string;
  ecosystemSummary: string;
  riskFlags: string[];
}

export interface BuilderAnalysisInput {
  githubUsername: string;
  walletAddresses: string[];
  qualifyingTransactionCount: number;
  validContractCount: number;
}

/**
 * Gemini is used for qualitative, human-readable summaries only — it never
 * decides tier or touches blockchain counts (those come from
 * chain-adapter.ts). If GEMINI_API_KEY isn't set this
 * falls back to a plain summary so the rest of the app never
 * has to special-case "no API key configured".
 */
export async function analyzeBuilderProfile(input: BuilderAnalysisInput): Promise<BuilderQualitativeAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return heuristicAnalysis(input);
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = [
      "You are assessing a Web3 builder's public GitHub profile for a credentialing platform.",
      `GitHub username: ${input.githubUsername}`,
      `Indexed onchain signal (already computed, do not re-derive): ${input.qualifyingTransactionCount} qualifying transactions, ${input.validContractCount} valid deployed contracts.`,
      "Write two short paragraphs as JSON: { \"githubSummary\": string, \"ecosystemSummary\": string }.",
      "githubSummary: 1-2 sentences on likely primary development areas and contribution quality, based only on the username and general judgment (no live repo access).",
      "ecosystemSummary: 1 sentence on likely ecosystem contribution given the onchain signal above.",
      "Do not invent specific repository names or numbers. Respond with JSON only.",
    ].join("\n");

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { githubSummary?: string; ecosystemSummary?: string };

    return {
      githubSummary: parsed.githubSummary ?? heuristicAnalysis(input).githubSummary,
      ecosystemSummary: parsed.ecosystemSummary ?? heuristicAnalysis(input).ecosystemSummary,
      riskFlags: [],
    };
  } catch (err) {
    logger.error({ err }, "Gemini analysis failed, falling back to heuristic summary");
    return heuristicAnalysis(input);
  }
}

function heuristicAnalysis(input: BuilderAnalysisInput): BuilderQualitativeAnalysis {
  const activityLevel =
    input.validContractCount >= 50 ? "extensive" : input.validContractCount >= 10 ? "substantial" : input.validContractCount >= 2 ? "consistent" : "early-stage";

  return {
    githubSummary: `Public profile @${input.githubUsername} reflects ${activityLevel} development activity.`,
    ecosystemSummary: `${input.qualifyingTransactionCount} qualifying transactions and ${input.validContractCount} deployed contracts detected across connected wallets.`,
    riskFlags: [],
  };
}

/** Stable per-input hash, used only for heuristic variety in mock/dev paths. */
export function stableSeed(input: string): number {
  return createHash("sha256").update(input).digest().readUInt32BE(0);
}
