/**
 * EndpointGuard — maps from Python `core/endpoint_validator.py`.
 *
 * In FastAPI the original used a Depends() that validated (url + method +
 * function) against the ENDPOINTS registry. The idiomatic NestJS equivalent is
 * a Guard combined with a small metadata decorator that names the expected
 * handler function, so the registry stays the single source of truth.
 *
 * Usage on a controller method:
 *
 *   @Get('v1/members/:id')
 *   @EndpointFunction('requestMemberGetV1')
 *   async requestMemberGetV1(...) { ... }
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ENDPOINTS } from '../constants/endpoints';

export const ENDPOINT_FUNCTION_KEY = 'endpointFunction';
export const EndpointFunction = (name: string) =>
  SetMetadata(ENDPOINT_FUNCTION_KEY, name);

@Injectable()
export class EndpointGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const functionName = this.reflector.get<string>(
      ENDPOINT_FUNCTION_KEY,
      context.getHandler(),
    );

    // Handlers without an @EndpointFunction tag are not registry-validated.
    if (!functionName) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();
    // Express exposes the matched route pattern (with :params) on route.path,
    // prefixed by baseUrl when mounted. This compares pattern-to-pattern with
    // the registry rather than comparing concrete URLs.
    const matchedPattern = `${request.baseUrl}${request.route?.path ?? request.path}`;

    const valid = ENDPOINTS.some(
      (ep) =>
        ep.url === matchedPattern &&
        ep.function === functionName &&
        ep.method === method,
    );

    if (!valid) {
      throw new NotFoundException({
        code: 'error_invalid_api',
        url: matchedPattern,
        function: functionName,
        method,
      });
    }
    return true;
  }
}
