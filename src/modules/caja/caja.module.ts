import { Module } from '@nestjs/common';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { CajaSchedulerService } from './caja-scheduler.service';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [CajaController],
  providers: [CajaService, CajaSchedulerService, PermisosGuard],
})
export class CajaModule {}
