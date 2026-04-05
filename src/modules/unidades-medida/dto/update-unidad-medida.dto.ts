import { PartialType } from '@nestjs/swagger';
import { CreateUnidadMedidaDto } from './create-unidad-medida.dto';
export class UpdateUnidadMedidaDto extends PartialType(CreateUnidadMedidaDto) {}
