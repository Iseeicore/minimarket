import { Module } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [ComprasController],
  providers: [ComprasService, PermisosGuard],
})
export class ComprasModule {}
