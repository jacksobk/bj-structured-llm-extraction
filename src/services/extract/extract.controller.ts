/**
 * Extract controller — Layer 5 (services). The web edge for extraction.
 * Tagged with @EndpointFunction so the EndpointGuard validates it against the
 * registry; delegates to the async requestExecute; sets HTTP status from the
 * response envelope.
 */

import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse as SwaggerResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { EndpointGuard, EndpointFunction } from '../../core/endpoint-guard';
import { requestExecute } from '../request-execute';
import { RequestExtract } from '../../code/extract/request-extract';
import { ApiResponse } from '../../models/response';
import { ExtractRequestDto } from '../../models/extract';

@ApiTags('Extract')
@Controller()
@UseGuards(EndpointGuard)
export class ExtractController {
  @Post('v1/extract')
  @EndpointFunction('requestExtractV1')
  @ApiOperation({
    summary: 'Extract validated structured intent from a freeform message',
  })
  @SwaggerResponse({ status: 200, type: ApiResponse })
  @SwaggerResponse({ status: 400, type: ApiResponse })
  @SwaggerResponse({ status: 422, type: ApiResponse })
  async requestExtractV1(
    @Body() dto: ExtractRequestDto,
    @Req() request: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await requestExecute({
      apiName: 'requestExtractV1',
      request,
      requestBody: dto,
      invoke: (logHandler, requestData) =>
        new RequestExtract(logHandler, requestData).extract(dto.text),
    });
    res.status(result.httpCode).json(result);
  }
}
