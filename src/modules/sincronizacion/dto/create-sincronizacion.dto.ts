import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601 } from 'class-validator';
import { TipoSincronizacion } from '@prisma/client';

export class CreateSincronizacionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  almacenId: number;

  @ApiProperty({ enum: TipoSincronizacion, example: TipoSincronizacion.MANUAL })
  @IsEnum(TipoSincronizacion)
  tipo: TipoSincronizacion;

  @ApiProperty({ example: '2026-04-01T00:00:00Z', description: 'Inicio del período (ISO 8601)' })
  @IsISO8601()
  desde: string;

  @ApiProperty({ example: '2026-04-05T23:59:59Z', description: 'Fin del período (ISO 8601)' })
  @IsISO8601()
  hasta: string;
}
