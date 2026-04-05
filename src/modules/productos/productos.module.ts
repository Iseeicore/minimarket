import { Module } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [ProductosController],
  providers: [ProductosService, PermisosGuard],
  exports: [ProductosService],
})
export class ProductosModule {}
