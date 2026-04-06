import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoSincronizacion, TipoSincronizacion } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterSincronizacionDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  almacenId?: number;

  @ApiPropertyOptional({ enum: EstadoSincronizacion })
  @IsOptional()
  @IsEnum(EstadoSincronizacion)
  estado?: EstadoSincronizacion;

  @ApiPropertyOptional({ enum: TipoSincronizacion })
  @IsOptional()
  @IsEnum(TipoSincronizacion)
  tipo?: TipoSincronizacion;
}
