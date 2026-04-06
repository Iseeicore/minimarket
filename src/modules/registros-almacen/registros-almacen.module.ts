import { Module } from '@nestjs/common';
import { RegistrosAlmacenService } from './registros-almacen.service';
import { RegistrosAlmacenController } from './registros-almacen.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [RegistrosAlmacenController],
  providers: [RegistrosAlmacenService, PermisosGuard],
  exports: [RegistrosAlmacenService],
})
export class RegistrosAlmacenModule {}
