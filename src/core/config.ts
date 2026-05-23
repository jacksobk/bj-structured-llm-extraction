/**
 * Configuration singleton — Layer 3 core.
 * Direct readonly fields, no getter methods. Reads process.env once at
 * construction. Includes the LLM-provider config that the extractor uses.
 */

class Config {
  // ---- App identity ----
  readonly appRootCategory = 'bj-backend';
  readonly appRoot = 'extract';
  readonly appName = 'bj-backend-extract';
  readonly appVersion = '1.0.0';
  readonly appContactName = 'Brian Jackson';
  readonly appContactEmail = 'brian@example.com';

  readonly basicUrl = '/bj-backend-extract/api';
  readonly appEnvironment = process.env.APP_ENVIRONMENT ?? 'DEV';
  readonly port = Number(process.env.PORT ?? 8210);

  // ---- Logging ----
  readonly logLevel = process.env.LOG_LEVEL ?? 'debug';
  readonly logPathDev = 'logs/';
  readonly logPathProd = '/code/logs/';

  // ---- LLM provider ----
  // provider: 'anthropic' | 'openai' | 'mock'
  // When no API key is present the service falls back to the deterministic
  // mock extractor so it runs with zero setup.
  readonly llmProvider = (process.env.LLM_PROVIDER ?? 'auto').toLowerCase();
  readonly anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? '';
  readonly openaiApiKey = process.env.OPENAI_API_KEY ?? '';
  readonly anthropicModel = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
  readonly openaiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  // ---- Extraction policy ----
  // Confidence at or below this is flagged for human review.
  readonly reviewConfidenceThreshold = Number(
    process.env.REVIEW_CONFIDENCE_THRESHOLD ?? 0.7,
  );
  // How many times to re-prompt the model when its output fails validation.
  readonly maxValidationRetries = Number(process.env.MAX_VALIDATION_RETRIES ?? 1);
  // Maximum accepted input length (characters) — a basic abuse guard.
  readonly maxInputChars = Number(process.env.MAX_INPUT_CHARS ?? 4000);
}

export const config = new Config();
