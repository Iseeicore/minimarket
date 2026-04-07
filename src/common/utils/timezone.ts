/**
 * Helpers de timezone para Lima (UTC-5).
 *
 * PostgreSQL guarda en UTC. El servidor (Railway) corre en UTC.
 * `new Date()` y `setHours()` operan en UTC en el servidor.
 *
 * Estas funciones convierten a hora Lima para queries de "hoy",
 * "inicio del día", "fin del día", etc.
 */

const LIMA_OFFSET = -5;

/** Hora actual en Lima como Date (sigue siendo UTC internamente, pero ajustada) */
export function nowLima(): Date {
  const now = new Date();
  return new Date(now.getTime() + LIMA_OFFSET * 60 * 60 * 1000);
}

/** Fecha "hoy" en Lima como string YYYY-MM-DD */
export function todayLima(): string {
  return nowLima().toISOString().slice(0, 10);
}

/** Inicio del día en Lima → Date UTC para queries Prisma */
export function startOfDayLima(fecha?: string): Date {
  const iso = fecha ?? todayLima();
  return new Date(`${iso}T00:00:00-05:00`);
}

/** Fin del día en Lima → Date UTC para queries Prisma */
export function endOfDayLima(fecha?: string): Date {
  const iso = fecha ?? todayLima();
  return new Date(`${iso}T23:59:59.999-05:00`);
}

/** Convierte un Date UTC a fecha local Lima (YYYY-MM-DD) */
export function toDateLima(date: Date): string {
  return new Date(date.getTime() + LIMA_OFFSET * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
