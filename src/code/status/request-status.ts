/**
 * RequestStatus — Layer 4 (code). Returns service health and runtime info,
 * including which LLM provider is currently resolved.
 */

import { RequestResponse } from '../../core/request-response';
import { ApiResponse } from '../../models/response';
import { config } from '../../core/config';
import type { RequestLogHandler } from '../../core/logging';
import type { RequestData } from '../extract/request-extract';
import { LlmProvider } from '../extract/llm-provider';

export class RequestStatus {
  private readonly logHandler: RequestLogHandler;
  private readonly requestData: RequestData;

  constructor(logHandler: RequestLogHandler, requestData: RequestData) {
    this.logHandler = logHandler;
    this.requestData = requestData;
  }

  getStatus(): ApiResponse {
    this.logHandler.info(`# STATUS CHECK -> ${this.requestData.hash}`);
    try {
      return RequestResponse.getResponse('service_status', {
        service: config.appName,
        version: config.appVersion,
        environment: config.appEnvironment,
        llmProvider: LlmProvider.resolveProvider(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return RequestResponse.raiseApiException(this.logHandler, 'exception_handle', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
