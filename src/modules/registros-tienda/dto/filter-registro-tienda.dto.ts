import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMovRegistro } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterRegistroTiendaDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  almacenId?: number;

  @ApiPropertyOptional({ enum: TipoMovRegistro })
  @IsOptional()
  @IsEnum(TipoMovRegistro)
  tipo?: TipoMovRegistro;

  @ApiPropertyOptional({ example: '2026-04-01', description: 'Fecha desde (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-04-30', description: 'Fecha hasta (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  hasta?: string;
}
