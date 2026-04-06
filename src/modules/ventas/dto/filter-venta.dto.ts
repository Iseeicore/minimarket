import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoVenta, MetodoPago, TipoComprobante } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterVentaDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  almacenId?: number;

  @ApiPropertyOptional({ enum: EstadoVenta })
  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @ApiPropertyOptional({ enum: MetodoPago })
  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  @ApiPropertyOptional({ enum: TipoComprobante })
  @IsOptional()
  @IsEnum(TipoComprobante)
  tipoComprobante?: TipoComprobante;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-04-05' })
  @IsOptional()
  @IsISO8601()
  hasta?: string;
}
