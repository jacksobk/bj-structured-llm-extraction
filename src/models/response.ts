/**
 * ApiResponse — Layer 2 model. The single response envelope returned by every
 * endpoint. The @ApiProperty decorators feed Swagger.
 */

import { ApiProperty } from '@nestjs/swagger';
import { ResponseStatus, ResponseClass } from '../constants/response-status-codes';

export class ApiResponse<T = unknown> {
  @ApiProperty({ example: 'extraction_verified' })
  code: string;

  @ApiProperty({ enum: ResponseStatus, example: ResponseStatus.SUCCESS })
  status: ResponseStatus;

  @ApiProperty({ enum: ResponseClass, example: ResponseClass.EXTRACTION })
  classType: ResponseClass;

  @ApiProperty({ example: 'Extraction completed and verified' })
  message: string;

  @ApiProperty({ example: 200 })
  httpCode: number;

  @ApiProperty({ required: false, nullable: true })
  data: T | null;

  constructor(init: ApiResponse<T>) {
    this.code = init.code;
    this.status = init.status;
    this.classType = init.classType;
    this.message = init.message;
    this.httpCode = init.httpCode;
    this.data = init.data ?? null;
  }
}
