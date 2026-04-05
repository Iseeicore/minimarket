import { Module } from '@nestjs/common';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [CajaController],
  providers: [CajaService, PermisosGuard],
})
export class CajaModule {}
