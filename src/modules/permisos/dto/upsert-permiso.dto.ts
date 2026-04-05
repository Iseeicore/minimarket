import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { ModuloApp } from '@prisma/client';

export class ModuloPermisoDto {
  @ApiProperty({ enum: ModuloApp, example: ModuloApp.VENTAS })
  @IsEnum(ModuloApp)
  modulo: ModuloApp;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  leer: boolean = false;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  crear: boolean = false;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  editar: boolean = false;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  eliminar: boolean = false;
}

export class BatchPermisosDto {
  @ApiProperty({ type: [ModuloPermisoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuloPermisoDto)
  permisos: ModuloPermisoDto[];
}
