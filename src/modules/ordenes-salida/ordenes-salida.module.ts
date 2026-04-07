import { Module } from '@nestjs/common';
import { OrdenesSalidaService } from './ordenes-salida.service';
import { OrdenesSalidaController } from './ordenes-salida.controller';

@Module({
  controllers: [OrdenesSalidaController],
  providers: [OrdenesSalidaService],
})
export class OrdenesSalidaModule {}
