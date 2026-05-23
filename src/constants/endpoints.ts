/**
 * Endpoint registry — Layer 1 constant, the single source of truth for which
 * (url + method + handler) combinations are valid. The EndpointGuard validates
 * incoming requests against this list.
 */

import { config } from '../core/config';

export interface EndpointDefinition {
  url: string;
  function: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
}

export const ENDPOINTS: EndpointDefinition[] = [
  {
    url: `${config.basicUrl}/v1/status`,
    function: 'requestStatusV1',
    method: 'GET',
    description: 'Returns service health and runtime info',
  },
  {
    url: `${config.basicUrl}/v1/extract`,
    function: 'requestExtractV1',
    method: 'POST',
    description: 'Extract validated structured intent from freeform text',
  },
];
