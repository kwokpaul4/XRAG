import "dotenv/config";

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
  ollamaChatModel: process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:4b",
  postgresUrl: process.env.POSTGRES_URL ?? "postgresql://xrag:xrag@localhost:5432/xrag",
  chromaUrl: process.env.CHROMA_URL ?? "http://localhost:8000",
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;
