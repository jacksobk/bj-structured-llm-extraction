/**
 * requestExecute — Layer 5 (services). Shared orchestration for every handler.
 *
 * Async variant: the invoke callback returns a Promise<ApiResponse> because the
 * extraction pipeline performs network I/O to the LLM provider. Otherwise
 * identical in shape to the synchronous template version: resolve hash,
 * assemble requestData, open per-request logger, invoke, log non-2xx, close.
 */

import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { config } from '../core/config';
import { RequestLogger } from '../core/logging';
import { RequestResponse } from '../core/request-response';
import { ApiResponse } from '../models/response';
import type { RequestData } from '../code/extract/request-extract';
import type { RequestLogHandler } from '../core/logging';

interface RequestExecuteArgs {
  apiName: string;
  request: Request;
  requestBody: unknown;
  invoke: (
    logHandler: RequestLogHandler,
    requestData: RequestData,
  ) => Promise<ApiResponse> | ApiResponse;
}

export async function requestExecute(args: RequestExecuteArgs): Promise<ApiResponse> {
  const { apiName, request, requestBody, invoke } = args;

  let requestHash: string = randomUUID();
  if (
    requestBody &&
    typeof requestBody === 'object' &&
    'requestHash' in requestBody &&
    (requestBody as Record<string, unknown>).requestHash
  ) {
    requestHash = String((requestBody as Record<string, unknown>).requestHash);
  }

  const requestData: RequestData = {
    url: request.originalUrl,
    host: request.hostname,
    port: config.port,
    service: config.appName,
    method: request.method.toLowerCase(),
    apiName,
    hash: requestHash,
    body: requestBody,
  };

  const logHandler = new RequestLogger().getLogger(apiName, requestHash);

  const result = await invoke(logHandler, requestData);

  if (Number(result.httpCode) !== 200 && Number(result.httpCode) !== 201) {
    logHandler.error(`# HTTP_CODE        -> ${result.httpCode}`);
    logHandler.error(`# CODE             -> ${result.code}`);
    logHandler.error(`# RESPONSE_MESSAGE -> ${result.message}`);
  }
  logHandler.info('# END');
  logHandler.close();
  return result;
}
