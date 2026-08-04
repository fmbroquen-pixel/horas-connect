import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { asegurarRoadmap } from "../src/lib/roadmap";

// Backfill único: crea el Roadmap por defecto (Onboarding + un tablero por
// trimestre contratado) en todos los clientes que todavía no lo tienen. Es
// idempotente —asegurarRoadmap saltea a los que ya tienen la marca—, así que
// se puede correr más de una vez sin duplicar nada.
//
//   npx tsx scripts/backfill-roadmap.ts

async function main() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
  });

  for (const c of clientes) {
    if (c.roadmapCreadoEn) {
      console.log(`— ${c.nombre}: ya tenía Roadmap`);
      continue;
    }
    await asegurarRoadmap(c);
    const listas = await prisma.listaRoadmap.count({ where: { clienteId: c.id } });
    console.log(`✓ ${c.nombre}: Roadmap creado (${listas} listas)`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
