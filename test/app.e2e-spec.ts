import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/login sin body retorna 400 (ValidationPipe activo)', async () => {
    const { status } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({});

    expect(status).toBe(400);
  });

  it('GET /api/v1/usuarios sin token retorna 401', async () => {
    const { status } = await request(app.getHttpServer()).get('/api/v1/usuarios');

    expect(status).toBe(401);
  });

  it('GET /api/v1/productos sin token retorna 401', async () => {
    const { status } = await request(app.getHttpServer()).get('/api/v1/productos');

    expect(status).toBe(401);
  });
});
