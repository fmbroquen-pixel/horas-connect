import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Foto de control de Time Tracking. Se corre antes y despues del cambio: si
// algun numero se movio, se perdio, duplico o revaluo algo.
async function main() {
  const vivos = { eliminadoEn: null };
  const [total, enPapelera] = await Promise.all([
    prisma.registroHoras.count({ where: vivos }),
    prisma.registroHoras.count({ where: { NOT: vivos } }),
  ]);
  const ag = await prisma.registroHoras.aggregate({
    where: vivos,
    _sum: { horas: true, montoUsd: true },
  });
  console.log(`registros vivos      = ${total}`);
  console.log(`registros en papelera= ${enPapelera}`);
  console.log(`horas totales        = ${ag._sum.horas}`);
  console.log(`usd total            = ${ag._sum.montoUsd}`);

  console.log("\npor usuario (worked_by):");
  const porUsuario = await prisma.registroHoras.groupBy({
    by: ["usuarioId"],
    where: vivos,
    _count: { _all: true },
    _sum: { horas: true, montoUsd: true },
  });
  const nombres = new Map(
    (await prisma.usuario.findMany({ select: { id: true, nombre: true } })).map((u) => [u.id, u.nombre]),
  );
  for (const g of porUsuario.sort((a, b) => Number(b._sum.horas) - Number(a._sum.horas))) {
    console.log(
      `  ${(nombres.get(g.usuarioId) ?? g.usuarioId).padEnd(22)} n=${String(g._count._all).padStart(3)}  hs=${String(g._sum.horas).padStart(8)}  usd=${g._sum.montoUsd}`,
    );
  }

  console.log("\nworked_by distinto de reported_by (cargado por un tercero):");
  const ajenos = await prisma.registroHoras.count({
    where: { ...vivos, NOT: { usuarioId: { equals: prisma.registroHoras.fields.creadoPorId } } },
  });
  console.log(`  ${ajenos} registros`);
}
main().finally(() => prisma.$disconnect());
