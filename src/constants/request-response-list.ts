/**
 * Response registry — Layer 1 constant, the single source of truth for every
 * response the service can emit. Business logic refers to entries by
 * `responseCode` only; the message, class, status, and HTTP code all flow from
 * this table.
 */

import { ResponseStatus, ResponseClass } from './response-status-codes';
import { HttpCode, HttpCodeValue } from './http-code';

export interface ResponseDefinition {
  responseCode: string;
  responseStatus: ResponseStatus;
  responseClass: ResponseClass;
  responseMessage: string;
  httpCode: HttpCodeValue;
}

export const LIST_RESPONSE: ResponseDefinition[] = [
  {
    responseCode: 'service_status',
    responseStatus: ResponseStatus.SUCCESS,
    responseClass: ResponseClass.SERVICE_STATUS,
    responseMessage: 'Service Running',
    httpCode: HttpCode.SUCCESS,
  },
  {
    responseCode: 'extraction_verified',
    responseStatus: ResponseStatus.SUCCESS,
    responseClass: ResponseClass.EXTRACTION,
    responseMessage: 'Extraction completed and verified',
    httpCode: HttpCode.SUCCESS,
  },
  {
    responseCode: 'extraction_needs_review',
    responseStatus: ResponseStatus.SUCCESS,
    responseClass: ResponseClass.EXTRACTION,
    responseMessage: 'Extraction completed but flagged for human review',
    httpCode: HttpCode.SUCCESS,
  },
  {
    responseCode: 'error_empty_input',
    responseStatus: ResponseStatus.ERROR,
    responseClass: ResponseClass.VALIDATION,
    responseMessage: 'Input text is empty or missing',
    httpCode: HttpCode.BAD_REQUEST,
  },
  {
    responseCode: 'error_input_rejected',
    responseStatus: ResponseStatus.ERROR,
    responseClass: ResponseClass.SAFETY,
    responseMessage: 'Input rejected by the safety screen',
    httpCode: HttpCode.BAD_REQUEST,
  },
  {
    responseCode: 'error_extraction_unparseable',
    responseStatus: ResponseStatus.ERROR,
    responseClass: ResponseClass.VALIDATION,
    responseMessage: 'Model output could not be parsed or validated after retry',
    httpCode: HttpCode.UNPROCESSABLE,
  },
  {
    responseCode: 'error_invalid_api',
    responseStatus: ResponseStatus.ERROR,
    responseClass: ResponseClass.REQUEST_EXECUTE,
    responseMessage: 'Invalid API endpoint',
    httpCode: HttpCode.NOT_FOUND,
  },
  {
    responseCode: 'exception_handle',
    responseStatus: ResponseStatus.ERROR,
    responseClass: ResponseClass.REQUEST_EXECUTE,
    responseMessage: 'An unexpected error occurred',
    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
  },
];
