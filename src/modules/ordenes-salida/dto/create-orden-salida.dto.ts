import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsPositive, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoOrden, OrigenStock } from '@prisma/client';

class CreateOrdenSalidaItemDto {
  @ApiProperty({ example: 1, description: 'ID de la variante' })
  @IsInt()
  @IsPositive()
  varianteId: number;

  @ApiProperty({ example: 5, description: 'Cantidad solicitada' })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ enum: ['ALMACEN', 'TIENDA'], default: 'ALMACEN' })
  @IsEnum(OrigenStock)
  origen: OrigenStock;
}

export class CreateOrdenSalidaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  almacenId: number;

  @ApiProperty({ enum: ['VENTA', 'TRANSFERENCIA'] })
  @IsEnum(TipoOrden)
  tipo: TipoOrden;

  @ApiProperty({ type: [CreateOrdenSalidaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrdenSalidaItemDto)
  items: CreateOrdenSalidaItemDto[];
}

export { CreateOrdenSalidaItemDto };
