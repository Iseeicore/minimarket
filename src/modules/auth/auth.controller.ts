import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

class LoginDto {
  @ApiProperty({ example: 'admin@minimarket.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión — retorna JWT + usuario' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar nueva empresa + usuario ADMIN — retorna JWT + usuario + empresa',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
