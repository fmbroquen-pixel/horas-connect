import { revalidatePath } from "next/cache";

// Un registro de horas está ACTIVO mientras no esté en la papelera. Todo KPI,
// gráfico o informe construido sobre horas tiene que partir de este filtro:
// es lo único que evita que un registro borrado siga sumando en algún
// tablero. Vive acá, y no repetido en cada consulta, para que agregar una
// pantalla nueva no dependa de acordarse.
export const SOLO_ACTIVOS = { eliminadoEn: null } as const;

// Pantallas que muestran horas y hay que invalidar cuando cambian: el
// historial, los KPIs del Home, los del proyecto y el informe de
// rentabilidad. Es una sola lista para que ninguna acción invalide de menos
// —el síntoma es un tablero que sigue mostrando horas ya borradas.
export function revalidarHoras(): void {
  revalidatePath("/timetracker");
  revalidatePath("/dashboard");
  revalidatePath("/proyectos", "layout");
  revalidatePath("/rentabilidad");
}
