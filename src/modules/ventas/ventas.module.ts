import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RegistrosAlmacenModule } from '../registros-almacen/registros-almacen.module';

@Module({
  imports: [RegistrosAlmacenModule],
  controllers: [VentasController],
  providers: [VentasService, PermisosGuard],
})
export class VentasModule {}
