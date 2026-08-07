// Backfill puntual, ya ejecutado el 2026-08-06 contra produccion.
//
// Los 28 registros de horas cargados antes del catalogo de Conceptos tenian
// concepto_id en NULL y conservaban su tema_id del catalogo viejo (Etapa). La
// pantalla los mostraba bien por un fallback a la etiqueta vieja, pero
// cualquier analisis por concepto los daba como no clasificados.
//
// Se migraron todos a "Otros": la taxonomia vieja (11 etiquetas en uso, tipo
// "Kickoff" o "Certificacion") no mapea contra los 12 conceptos actuales, y
// forzar equivalencias habria inventado una clasificacion que nadie eligio.
// "Otros" dice lo que realmente son: datos anteriores al catalogo.
//
// REVERSIBLE: tema_id no se toca. Para deshacerlo alcanza con volver a poner
// concepto_id en NULL en los ids del .snapshot.json que acompana a este
// archivo.
//
//   npx tsx --env-file=.env prisma/backfills/20260806-conceptos-otros.ts <snapshot.json>            # dry run
//   npx tsx --env-file=.env prisma/backfills/20260806-conceptos-otros.ts <snapshot.json> --aplicar

import { writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";

const SNAPSHOT = process.argv[2];
const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const otros = await prisma.concepto.findFirst({ where: { nombre: "Otros" } });
  if (!otros) throw new Error('No existe el concepto "Otros".');

  const pendientes = await prisma.registroHoras.findMany({
    where: { conceptoId: null },
    select: {
      id: true, conceptoId: true, etapaId: true, eliminadoEn: true,
      etapa: { select: { etiqueta: true } },
    },
  });

  writeFileSync(SNAPSHOT, JSON.stringify(pendientes, null, 1), "utf8");

  const porEtiqueta: Record<string, number> = {};
  for (const r of pendientes) {
    const k = r.etapa?.etiqueta ?? "(sin tema)";
    porEtiqueta[k] = (porEtiqueta[k] ?? 0) + 1;
  }
  console.log(`concepto destino: "${otros.nombre}" (${otros.id})`);
  console.log(`registros a migrar: ${pendientes.length} (${pendientes.filter((r) => r.eliminadoEn).length} en papelera)`);
  console.log("por etiqueta legacy:", JSON.stringify(porEtiqueta, null, 1));
  console.log(`snapshot -> ${SNAPSHOT}`);

  if (!APLICAR) {
    console.log("\nDRY RUN: no se escribio nada. Repetir con --aplicar.");
    await prisma.$disconnect();
    return;
  }

  const r = await prisma.registroHoras.updateMany({
    where: { conceptoId: null },
    data: { conceptoId: otros.id },
  });
  console.log(`\nAPLICADO: ${r.count} registro(s) actualizados.`);

  const quedan = await prisma.registroHoras.count({ where: { conceptoId: null } });
  const conOtros = await prisma.registroHoras.count({ where: { conceptoId: otros.id } });
  const temaIntacto = await prisma.registroHoras.count({ where: { etapaId: { not: null } } });
  console.log(`verificacion -> sin concepto: ${quedan} | con Otros: ${conOtros} | tema_id conservado: ${temaIntacto}`);
  await prisma.$disconnect();
}
main();
