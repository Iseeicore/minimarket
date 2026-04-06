import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoReconciliacion } from '@prisma/client';

export class ResolverItemDto {
  @ApiProperty({
    enum: [EstadoReconciliacion.RESUELTO, EstadoReconciliacion.COINCIDE, EstadoReconciliacion.PENDIENTE_REVISION],
    description: 'Nuevo estado para el item',
  })
  @IsEnum(EstadoReconciliacion)
  estado: EstadoReconciliacion;

  @ApiPropertyOptional({ example: 'Diferencia justificada por merma en transporte' })
  @IsOptional()
  @IsString()
  notas?: string;
}
