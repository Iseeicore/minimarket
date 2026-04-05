import { Module } from '@nestjs/common';
import { VariantesService } from './variantes.service';
import { VariantesController } from './variantes.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [VariantesController],
  providers: [VariantesService, PermisosGuard],
  exports: [VariantesService],
})
export class VariantesModule {}
