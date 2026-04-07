import {
  Controller,
  Post,
  Query,
  ParseIntPipe,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CargaMasivaService } from './carga-masiva.service';

@ApiTags('carga-masiva')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('carga-masiva')
export class CargaMasivaController {
  constructor(private readonly service: CargaMasivaService) {}

  @Post('catalogo')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Carga masiva de catálogo desde Excel (.xlsx)' })
  async cargarCatalogo(
    @UploadedFile() file: Express.Multer.File,
    @Query('almacenId', ParseIntPipe) almacenId: number,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Debe enviar un archivo .xlsx');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      throw new BadRequestException('Solo se aceptan archivos .xlsx');
    }

    return this.service.cargarCatalogo(file.buffer, req.user.empresaId, almacenId);
  }
}
