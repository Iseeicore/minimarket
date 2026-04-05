import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  // --- Empresa ---
  @ApiProperty({ example: 'MedioMundo S.A.C.' })
  @IsString()
  @MaxLength(100)
  nombreEmpresa: string;

  @ApiProperty({ required: false, example: '20123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ruc?: string;

  @ApiProperty({ required: false, example: 'Av. Principal 123' })
  @IsOptional()
  @IsString()
  direccionEmpresa?: string;

  @ApiProperty({ required: false, example: '987654321' })
  @IsOptional()
  @IsString()
  telefonoEmpresa?: string;

  // --- Usuario ADMIN ---
  @ApiProperty({ example: 'Administrador' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'admin@miempresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'mipassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
