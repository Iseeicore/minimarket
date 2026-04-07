import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterOrdenSalidaDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  almacenId?: number;

  @ApiPropertyOptional({ example: '2026-04-07', description: 'Fecha desde (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-04-07', description: 'Fecha hasta (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  hasta?: string;
}
