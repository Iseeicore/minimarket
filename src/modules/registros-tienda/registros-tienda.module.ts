import { Module } from '@nestjs/common';
import { RegistrosTiendaService } from './registros-tienda.service';
import { RegistrosTiendaController } from './registros-tienda.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [RegistrosTiendaController],
  providers: [RegistrosTiendaService, PermisosGuard],
  exports: [RegistrosTiendaService],
})
export class RegistrosTiendaModule {}
