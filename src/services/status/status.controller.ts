/**
 * Status controller — Layer 5 (services). Health/runtime endpoint.
 */

import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse as SwaggerResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { EndpointGuard, EndpointFunction } from '../../core/endpoint-guard';
import { requestExecute } from '../request-execute';
import { RequestStatus } from '../../code/status/request-status';
import { ApiResponse } from '../../models/response';

@ApiTags('Status')
@Controller()
@UseGuards(EndpointGuard)
export class StatusController {
  @Get('v1/status')
  @EndpointFunction('requestStatusV1')
  @ApiOperation({ summary: 'Service health and runtime info' })
  @SwaggerResponse({ status: 200, type: ApiResponse })
  async requestStatusV1(@Req() request: Request, @Res() res: Response): Promise<void> {
    const result = await requestExecute({
      apiName: 'requestStatusV1',
      request,
      requestBody: {},
      invoke: (logHandler, requestData) =>
        new RequestStatus(logHandler, requestData).getStatus(),
    });
    res.status(result.httpCode).json(result);
  }
}
