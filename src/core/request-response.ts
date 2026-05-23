/**
 * RequestResponse — maps from Python `core/request_response.py`.
 *
 * The only place ApiResponse envelopes are constructed. Business logic calls
 * getResponse('some_code', data) and the message/class/status/httpCode are all
 * resolved from LIST_RESPONSE. This guarantees every response in the service is
 * registered and consistent.
 */

import { ApiResponse } from '../models/response';
import { LIST_RESPONSE } from '../constants/request-response-list';
import { ResponseStatus, ResponseClass } from '../constants/response-status-codes';
import { HttpCode } from '../constants/http-code';
import type { RequestLogHandler } from './logging';

export class RequestResponse {
  static getResponse<T = unknown>(
    responseCode: string,
    data: T | null = null,
  ): ApiResponse<T> {
    const definition = LIST_RESPONSE.find(
      (item) => item.responseCode === responseCode,
    );

    if (!definition) {
      return new ApiResponse<T>({
        code: 'unknown_response_code',
        status: ResponseStatus.ERROR,
        classType: ResponseClass.REQUEST_EXECUTE,
        message: `Unknown response code: ${responseCode}`,
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        data,
      });
    }

    return new ApiResponse<T>({
      code: definition.responseCode,
      status: definition.responseStatus,
      classType: definition.responseClass,
      message: definition.responseMessage,
      httpCode: definition.httpCode,
      data,
    });
  }

  static raiseApiException<T = unknown>(
    logHandler: RequestLogHandler | null,
    responseCode: string,
    data: T | null = null,
  ): ApiResponse<T> {
    if (logHandler) {
      const bar = '='.repeat(60);
      logHandler.error(bar);
      logHandler.error('EXCEPTION RAISED');
      logHandler.error(bar);
      logHandler.error(`Response Code: ${responseCode}`);
      logHandler.error(`Data: ${JSON.stringify(data)}`);
      logHandler.error(bar);
    }
    return RequestResponse.getResponse<T>(responseCode, data);
  }
}
