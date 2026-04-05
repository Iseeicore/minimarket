import { PartialType } from '@nestjs/swagger';
import { CreateAlmacenDto } from './create-almacen.dto';
export class UpdateAlmacenDto extends PartialType(CreateAlmacenDto) {}
