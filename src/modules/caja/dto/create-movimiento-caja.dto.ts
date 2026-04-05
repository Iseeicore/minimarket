import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoMovCaja } from '@prisma/client';

export class CreateMovimientoCajaDto {
  @ApiProperty({ enum: TipoMovCaja })
  @IsEnum(TipoMovCaja)
  tipo: TipoMovCaja;

  @ApiProperty({ example: 50.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
