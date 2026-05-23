/**
 * Status module — Layer 6 (api). Registers the status controller.
 */

import { Module } from '@nestjs/common';
import { StatusController } from '../../../services/status/status.controller';

@Module({
  controllers: [StatusController],
})
export class StatusModule {}
