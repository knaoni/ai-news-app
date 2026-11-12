import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY 환경 변수가 설정되어 있지 않습니다.");
}

export const anthropicClient = new Anthropic();

export const CLAUDE_HAIKU_MODEL = "claude-haiku-5-5" as const;

export const CLAUDE_BATCH_CHUNK_SIZE = 20;
