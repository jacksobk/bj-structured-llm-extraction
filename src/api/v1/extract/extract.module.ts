/**
 * Extract module — Layer 6 (api). Registers the extract controller.
 */

import { Module } from '@nestjs/common';
import { ExtractController } from '../../../services/extract/extract.controller';

@Module({
  controllers: [ExtractController],
})
export class ExtractModule {}
