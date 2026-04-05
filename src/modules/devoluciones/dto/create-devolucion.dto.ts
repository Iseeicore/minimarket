import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoDescuento } from '@prisma/client';

export class CreateItemDevolucionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  itemVentaId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  cantidadDevuelta: number;

  @ApiProperty({ example: 12.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoDevuelto: number;

  @ApiProperty({ enum: TipoDescuento, required: false, default: TipoDescuento.NINGUNO })
  @IsOptional()
  @IsEnum(TipoDescuento)
  tipoDescuento?: TipoDescuento;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorDescuento?: number;
}

export class CreateDevolucionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  ventaId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [CreateItemDevolucionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemDevolucionDto)
  items: CreateItemDevolucionDto[];
}
