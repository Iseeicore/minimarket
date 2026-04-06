import { Module } from '@nestjs/common';
import { SincronizacionService } from './sincronizacion.service';
import { SincronizacionController } from './sincronizacion.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [SincronizacionController],
  providers: [SincronizacionService, PermisosGuard],
})
export class SincronizacionModule {}
