import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PermisosGuard } from '../../common/guards/permisos.guard';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, PermisosGuard],
})
export class DashboardModule {}
