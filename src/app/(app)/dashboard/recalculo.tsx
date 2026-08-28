// El recálculo dejó de ser del Home: Time Tracking, Expenses y Analytics
// muestran el mismo feedback al cambiar de mes, así que vive en components.
// Este archivo queda como puente para no tocar los imports de esta carpeta.
export {
  RecalculoProvider,
  ZonaRecalculable,
  BloqueRecalculable,
  useRecalculo,
} from "@/components/recalculo";
