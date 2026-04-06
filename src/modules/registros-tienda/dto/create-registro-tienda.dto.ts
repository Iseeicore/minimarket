import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TipoMovRegistro } from '@prisma/client';

export class CreateRegistroTiendaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  almacenId: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  varianteId: number;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ enum: TipoMovRegistro, example: TipoMovRegistro.SALIDA })
  @IsEnum(TipoMovRegistro)
  tipo: TipoMovRegistro;

  @ApiPropertyOptional({ example: 'Salida al mostrador' })
  @IsOptional()
  @IsString()
  notas?: string;
}
