/**
 * Root application module — Layer 7. Imports every feature module.
 */

import { Module } from '@nestjs/common';
import { StatusModule } from './api/v1/status/status.module';
import { ExtractModule } from './api/v1/extract/extract.module';

@Module({
  imports: [StatusModule, ExtractModule],
})
export class AppModule {}
