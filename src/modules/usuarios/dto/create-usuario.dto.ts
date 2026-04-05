import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'juan@miempresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: RolUsuario, example: RolUsuario.ALMACENERO })
  @IsEnum(RolUsuario)
  rol: RolUsuario;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  almacenId?: number;
}
