import {
  startOfDayLima,
  endOfDayLima,
  todayLima,
  toDateLima,
  nowLima,
} from './timezone';

describe('Timezone helpers (Lima UTC-5)', () => {
  describe('startOfDayLima', () => {
    it('convierte fecha YYYY-MM-DD a medianoche Lima en UTC (05:00Z)', () => {
      const result = startOfDayLima('2026-04-07');
      expect(result.toISOString()).toBe('2026-04-07T05:00:00.000Z');
    });

    it('sin argumento usa hoy en Lima', () => {
      const result = startOfDayLima();
      expect(result).toBeInstanceOf(Date);
      // Siempre debe ser las 05:00:00Z de algún día
      expect(result.toISOString()).toMatch(/T05:00:00\.000Z$/);
    });
  });

  describe('endOfDayLima', () => {
    it('convierte fecha YYYY-MM-DD a 23:59:59.999 Lima en UTC (04:59:59.999Z del día siguiente)', () => {
      const result = endOfDayLima('2026-04-07');
      expect(result.toISOString()).toBe('2026-04-08T04:59:59.999Z');
    });

    it('el rango startOfDay..endOfDay cubre 24 horas menos 1ms', () => {
      const start = startOfDayLima('2026-04-07');
      const end = endOfDayLima('2026-04-07');
      const diff = end.getTime() - start.getTime();
      // 24h - 1ms = 86399999ms
      expect(diff).toBe(86399999);
    });
  });

  describe('todayLima', () => {
    it('devuelve string YYYY-MM-DD', () => {
      const result = todayLima();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('toDateLima', () => {
    it('convierte UTC midnight a fecha Lima (día anterior si es antes de 05:00Z)', () => {
      // 2026-04-08 01:00:00 UTC = 2026-04-07 20:00:00 Lima
      const utcDate = new Date('2026-04-08T01:00:00.000Z');
      expect(toDateLima(utcDate)).toBe('2026-04-07');
    });

    it('convierte UTC mediodía a misma fecha Lima', () => {
      // 2026-04-07 12:00:00 UTC = 2026-04-07 07:00:00 Lima
      const utcDate = new Date('2026-04-07T12:00:00.000Z');
      expect(toDateLima(utcDate)).toBe('2026-04-07');
    });

    it('convierte UTC 04:59 a día anterior Lima (23:59 Lima)', () => {
      // 2026-04-08 04:59:00 UTC = 2026-04-07 23:59:00 Lima
      const utcDate = new Date('2026-04-08T04:59:00.000Z');
      expect(toDateLima(utcDate)).toBe('2026-04-07');
    });

    it('convierte UTC 05:00 al mismo día Lima (00:00 Lima)', () => {
      // 2026-04-08 05:00:00 UTC = 2026-04-08 00:00:00 Lima
      const utcDate = new Date('2026-04-08T05:00:00.000Z');
      expect(toDateLima(utcDate)).toBe('2026-04-08');
    });
  });

  describe('nowLima', () => {
    it('devuelve Date 5 horas detrás de UTC', () => {
      const now = new Date();
      const lima = nowLima();
      const diff = now.getTime() - lima.getTime();
      // Debería ser ~5 horas (con margen de 1 segundo por ejecución)
      expect(Math.abs(diff - 5 * 60 * 60 * 1000)).toBeLessThan(1000);
    });
  });

  describe('Caso crítico: 8 PM Lima = día siguiente UTC', () => {
    it('un registro creado a las 8 PM Lima (01:00 UTC+1) cae dentro del rango del día en Lima', () => {
      // Escenario: son las 8 PM del 7 de abril en Lima
      // En UTC es 2026-04-08T01:00:00Z
      const registroCreadoEn = new Date('2026-04-08T01:00:00.000Z');

      const inicioLima = startOfDayLima('2026-04-07');
      const finLima = endOfDayLima('2026-04-07');

      // El registro DEBE caer dentro del rango
      expect(registroCreadoEn.getTime()).toBeGreaterThanOrEqual(inicioLima.getTime());
      expect(registroCreadoEn.getTime()).toBeLessThanOrEqual(finLima.getTime());
    });

    it('un registro creado a las 12:01 AM Lima (05:01 UTC) NO cae en el día anterior', () => {
      // 2026-04-08 00:01 Lima = 2026-04-08T05:01:00Z
      const registro = new Date('2026-04-08T05:01:00.000Z');

      const finDiaAnterior = endOfDayLima('2026-04-07');

      // NO debe caer en el día 7
      expect(registro.getTime()).toBeGreaterThan(finDiaAnterior.getTime());
    });
  });
});
