import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MetodoPago, TipoDescuento } from '@prisma/client';

export class CreateItemVentaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  varianteId: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 12.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioUnitario: number;

  @ApiProperty({ enum: TipoDescuento, default: TipoDescuento.NINGUNO })
  @IsOptional()
  @IsEnum(TipoDescuento)
  tipoDescuento?: TipoDescuento;

  @ApiProperty({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorDescuento?: number;
}

export class CreateVentaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  almacenId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  cajaId: number;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @IsInt()
  contactoId?: number;

  @ApiProperty({ enum: MetodoPago, default: MetodoPago.EFECTIVO })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiProperty({ type: [CreateItemVentaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemVentaDto)
  items: CreateItemVentaDto[];
}
