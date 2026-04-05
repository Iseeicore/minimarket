import { IsString, IsInt, IsOptional, IsNumber, IsBoolean, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVarianteDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productoId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  unidadId: number;

  @ApiProperty({ example: '1.5 LT' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ required: false, example: 'AGU-1.5' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 8.50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  costoBase: number;

  @ApiProperty({ example: 15.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precioVenta: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  stockMinimo: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
