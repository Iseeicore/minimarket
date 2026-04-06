import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago, TipoComprobante, TipoDescuento } from '@prisma/client';

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

  @ApiPropertyOptional({ enum: TipoComprobante, default: TipoComprobante.TICKET })
  @IsOptional()
  @IsEnum(TipoComprobante)
  tipoComprobante?: TipoComprobante;

  // Serie fija del talonario — ej. "B001", "F001". Requerida si tipoComprobante != TICKET
  @ApiPropertyOptional({ example: 'B001' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]\d{3}$/, { message: 'serie debe tener formato A000 (ej. B001, F001)' })
  serie?: string;

  // 10 dígitos secuenciales — ej. "0000000001"
  @ApiPropertyOptional({ example: '0000000001' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'nroComprobante debe tener exactamente 10 dígitos' })
  nroComprobante?: string;

  @ApiPropertyOptional({ example: 'Cliente pidió boleta para reembolso' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [CreateItemVentaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemVentaDto)
  items: CreateItemVentaDto[];
}
