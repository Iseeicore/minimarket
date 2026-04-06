import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class RoleThrottlerGuard extends ThrottlerGuard {

  // Tracker por userId autenticado — no por IP, que puede ser compartida en redes locales
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const decoded = this.decodeJwt(req.headers?.authorization);
    if (decoded?.sub) return `uid_${decoded.sub}`;
    return req.ip ?? req.headers?.['x-forwarded-for'] ?? 'anonymous';
  }

  // Cada throttler aplica solo al rol que le corresponde
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const req = requestProps.context.switchToHttp().getRequest();
    const rol = this.decodeJwt(req.headers?.authorization)?.rol ?? null;
    const { name } = requestProps.throttler;

    // ALMACENERO: 300 req / 3 min — atiende el mostrador, pide muchas peticiones seguidas
    if (name === 'almacenero'   && rol !== 'ALMACENERO')   return true;
    // ADMIN: 100 req / 3 min — uso administrativo, menos frecuencia
    if (name === 'admin'        && rol !== 'ADMIN')        return true;
    // JEFE_VENTA: 200 req / 3 min — tienda activa con registro frecuente
    if (name === 'jefe_venta'   && rol !== 'JEFE_VENTA')   return true;
    // JEFE_ALMACEN: 200 req / 3 min — almacén activo con notas de venta y registros
    if (name === 'jefe_almacen' && rol !== 'JEFE_ALMACEN') return true;
    // PUBLICO: 10 req / 1 min — solo aplica a login y register (sin JWT)
    if (name === 'publico'      && rol !== null)            return true;

    return super.handleRequest(requestProps);
  }

  // Decodifica payload del JWT sin verificar firma — solo para leer el rol
  // La verificación real sigue siendo responsabilidad del JwtAuthGuard
  private decodeJwt(authHeader?: string): { sub?: number; rol?: string } | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
      const payload = authHeader.split(' ')[1].split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch {
      return null;
    }
  }
}
