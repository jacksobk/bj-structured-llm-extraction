/**
 * HTTP status codes used by the service — Layer 1 constant.
 */

export const HttpCode = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  UNPROCESSABLE: 422,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpCodeValue = (typeof HttpCode)[keyof typeof HttpCode];
