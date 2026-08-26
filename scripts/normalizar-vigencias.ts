import "dotenv/config";
import { writeFileSync } from "fs";
import { prisma } from "../src/lib/prisma";
import { diaUtc, reconstruirVigencias } from "../src/lib/vigencias";

// Normaliza el historial de tarifas que quedó de antes de que la vigencia se
// declarara.
//
// Hasta ahora `vigenteDesde` se estampaba con el instante en que alguien
// apretaba Guardar en Settings, así que la tabla era un registro de clics y no
// de vigencias: filas de duración cero (poner un valor y corregirlo en el
// mismo minuto dejaba las dos) y tramos separados por milisegundos. Desde que
// el monto de un registro se calcula con la tarifa de SU fecha, esa diferencia
// dejó de ser cosmética.
//
// Qué hace, por combinación de usuario + modalidad + ownership:
//   - lleva cada `vigenteDesde` a medianoche UTC (la vigencia es un día, no un
//     instante);
//   - de varios cambios del mismo día deja el último, que es el que la persona
//     quiso dejar;
//   - une tramos consecutivos con el mismo valor, que no eran un cambio;
//   - deriva cada `vigenteHasta` del `vigenteDesde` del tramo siguiente, así
//     la cadena no queda con huecos ni solapamientos.
//
// Es idempotente: correrlo dos veces da el mismo resultado. Y no inventa
// valores — solo reordena y descarta lo que no llegó a regir.
//
// Ensayo en seco (no escribe nada):
//   npx tsx scripts/normalizar-vigencias.ts
//
// Aplicar de verdad, dejando antes un respaldo en respaldo-tarifas-<hoy>.json:
//   npx tsx scripts/normalizar-vigencias.ts --aplicar

const APLICAR = process.argv.includes("--aplicar");
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "abierta");
const conHora = (d: Date | null) =>
  d ? d.toISOString().slice(0, 16).replace("T", " ") : "abierta";

async function main() {
  const todas = await prisma.tarifa.findMany({
    include: { usuario: { select: { nombre: true } } },
  });

  if (todas.length === 0) {
    console.log("No hay tarifas cargadas.");
    return;
  }

  if (APLICAR) {
    // El respaldo va primero: los borrados no se deshacen.
    const destino = `respaldo-tarifas-${new Date().toISOString().slice(0, 10)}.json`;
    writeFileSync(
      destino,
      JSON.stringify(
        todas,
        (_k, v) =>
          typeof v === "object" && v?.constructor?.name === "Decimal"
            ? String(v)
            : v,
        2,
      ),
    );
    console.log(`Respaldo de ${todas.length} filas en ${destino}\n`);
  }

  const combos = new Map<string, typeof todas>();
  for (const t of todas) {
    const k = `${t.usuarioId}|${t.modalidad}|${t.ownership}`;
    combos.set(k, [...(combos.get(k) ?? []), t]);
  }

  let borradas = 0;
  let reencuadradas = 0;

  for (const [, filas] of combos) {
    const plan = reconstruirVigencias(
      filas.map((f) => ({
        id: f.id,
        valorUsd: Number(f.valorUsd),
        vigenteDesde: diaUtc(f.vigenteDesde),
        createdAt: f.createdAt,
      })),
    );

    const cambian = plan.actualizar.filter((a) => {
      const orig = filas.find((f) => f.id === a.id)!;
      return (
        orig.vigenteDesde.getTime() !== a.vigenteDesde.getTime() ||
        (orig.vigenteHasta?.getTime() ?? null) !==
          (a.vigenteHasta?.getTime() ?? null)
      );
    });

    if (plan.eliminar.length === 0 && cambian.length === 0) continue;

    const f0 = filas[0];
    console.log(`${f0.usuario.nombre} · ${f0.modalidad}/${f0.ownership}`);
    for (const f of [...filas].sort(
      (a, b) => +a.vigenteDesde - +b.vigenteDesde,
    )) {
      console.log(
        `   antes   ${String(Number(f.valorUsd)).padStart(6)}  ${conHora(f.vigenteDesde)} → ${conHora(f.vigenteHasta)}`,
      );
    }
    for (const a of plan.actualizar) {
      const v = Number(filas.find((f) => f.id === a.id)!.valorUsd);
      console.log(
        `   queda   ${String(v).padStart(6)}  ${iso(a.vigenteDesde)} → ${iso(a.vigenteHasta)}`,
      );
    }
    console.log(`   se borran ${plan.eliminar.length}\n`);

    borradas += plan.eliminar.length;
    reencuadradas += cambian.length;

    if (APLICAR) {
      await prisma.$transaction([
        // Los borrados van primero: liberan el unique por (combinación,
        // fecha) antes de que las que quedan se muevan a su día normalizado.
        ...(plan.eliminar.length > 0
          ? [prisma.tarifa.deleteMany({ where: { id: { in: plan.eliminar } } })]
          : []),
        ...plan.actualizar.map((a) =>
          prisma.tarifa.update({
            where: { id: a.id },
            data: { vigenteDesde: a.vigenteDesde, vigenteHasta: a.vigenteHasta },
          }),
        ),
      ]);
    }
  }

  console.log(
    APLICAR
      ? `Aplicado: ${borradas} filas borradas, ${reencuadradas} reencuadradas.`
      : `Ensayo en seco: se borrarían ${borradas} filas y se reencuadrarían ${reencuadradas}. Nada se escribió.\nPara aplicar: npx tsx scripts/normalizar-vigencias.ts --aplicar`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
