/**
 * RequestExtract — Layer 4 (code). The Request{Domain} orchestrator.
 *
 * Runs the full pipeline and returns an ApiResponse:
 *   safety screen → LLM extraction → schema validation → corrective retry →
 *   deterministic verification → review-tagged structured result.
 *
 * Holds business logic only; constructed per request with the log handler and
 * the assembled requestData.
 */

import { RequestResponse } from '../../core/request-response';
import { ApiResponse } from '../../models/response';
import type { RequestLogHandler } from '../../core/logging';
import { config } from '../../core/config';
import { ExtractedIntent } from '../../models/extract';
import { SafetyScreen } from './safety-screen';
import { PromptBuilder } from './prompt-builder';
import { LlmProvider } from './llm-provider';
import { OutputVerifier } from './output-verifier';

export interface RequestData {
  url: string;
  host: string;
  port: number;
  service: string;
  method: string;
  apiName: string;
  hash: string;
  body: unknown;
}

export interface ExtractionData {
  result: ExtractedIntent;
  provider: string;
  model: string;
  attempts: number;
}

export class RequestExtract {
  private readonly logHandler: RequestLogHandler;
  private readonly requestData: RequestData;
  private readonly requestHash: string;

  constructor(logHandler: RequestLogHandler, requestData: RequestData) {
    this.logHandler = logHandler;
    this.requestData = requestData;
    this.requestHash = requestData.hash;
  }

  async extract(text: string): Promise<ApiResponse> {
    this.logHandler.info(`# FUNCTION -> EXTRACT  HASH -> ${this.requestHash}`);
    try {
      // --- Stage 0: input present ---
      if (!text || !text.trim()) {
        return RequestResponse.getResponse('error_empty_input');
      }

      // --- Stage 1: safety screen (deterministic, pre-model) ---
      const safety = SafetyScreen.screen(text, config.maxInputChars);
      this.logHandler.debug(`SAFETY -> ${JSON.stringify(safety)}`);
      if (!safety.allowed) {
        return RequestResponse.getResponse('error_input_rejected', {
          reasons: safety.reasons,
        });
      }

      // --- Stages 2-4: extract → validate → corrective retry ---
      const system = PromptBuilder.system();
      let userPrompt = PromptBuilder.user(text);
      let attempts = 0;
      let lastErrors: string[] = [];
      let providerName = 'mock';
      let modelName = '';

      const maxAttempts = config.maxValidationRetries + 1;
      while (attempts < maxAttempts) {
        attempts += 1;
        const llm = await LlmProvider.complete(system, userPrompt);
        providerName = llm.provider;
        modelName = llm.model;
        this.logHandler.debug(`MODEL_RAW[attempt ${attempts}] -> ${llm.raw}`);

        const outcome = OutputVerifier.verify(llm.raw);
        if (outcome.ok && outcome.result) {
          // --- Stage 5: review-tagged response ---
          const data: ExtractionData = {
            result: outcome.result,
            provider: providerName,
            model: modelName,
            attempts,
          };
          const code = outcome.result.requiresHumanReview
            ? 'extraction_needs_review'
            : 'extraction_verified';
          this.logHandler.info(
            `# VERIFIED -> intent=${outcome.result.intent} review=${outcome.result.requiresHumanReview} attempts=${attempts}`,
          );
          return RequestResponse.getResponse<ExtractionData>(code, data);
        }

        // Failed validation — feed concrete errors back for a corrective retry.
        lastErrors = outcome.errors;
        this.logHandler.error(`VALIDATION_FAILED[attempt ${attempts}] -> ${JSON.stringify(lastErrors)}`);
        userPrompt = `${PromptBuilder.user(text)}\n\n${PromptBuilder.retry(llm.raw, lastErrors)}`;
      }

      // Exhausted retries without a valid, verifiable result.
      return RequestResponse.getResponse('error_extraction_unparseable', {
        attempts,
        errors: lastErrors,
        provider: providerName,
      });
    } catch (error) {
      return RequestResponse.raiseApiException(this.logHandler, 'exception_handle', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
