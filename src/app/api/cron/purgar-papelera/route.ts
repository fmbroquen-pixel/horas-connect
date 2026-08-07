import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { RETENCION_DIAS } from "@/app/(app)/papelera/constantes";
import { DIA_MS } from "@/lib/dias-habiles";

// Purga de la papelera. La app promete que lo eliminado se conserva
// RETENCION_DIAS días y después se borra; hasta acá esa segunda mitad no
// existía y los registros quedaban para siempre con el contador en cero.
//
// Alcance: los tres tipos que la papelera muestra y permite restaurar (ver
// papelera/actions.ts). Los viáticos habían quedado afuera mientras su módulo
// no estaba en la UI —purgar lo que nadie puede ver ni recuperar es destruir
// datos a ciegas, no cumplir una política— y vuelven con él.
//
// Se dispara desde el cron de Vercel (vercel.json). Vercel manda el header
// Authorization: Bearer $CRON_SECRET cuando esa variable está definida en el
// proyecto; sin la variable la ruta no corre, para que un endpoint que borra
// datos nunca quede abierto por un olvido de configuración.
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado: la purga no se ejecuta." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const corte = new Date(Date.now() - RETENCION_DIAS * DIA_MS);
  const vencidos = { eliminadoEn: { lt: corte } };

  const [horas, viaticos, vacaciones] = await prisma.$transaction([
    prisma.registroHoras.deleteMany({ where: vencidos }),
    prisma.viatico.deleteMany({ where: vencidos }),
    prisma.vacacion.deleteMany({ where: vencidos }),
  ]);

  return NextResponse.json({
    corte: corte.toISOString(),
    retencionDias: RETENCION_DIAS,
    borrados: {
      horas: horas.count,
      viaticos: viaticos.count,
      vacaciones: vacaciones.count,
    },
  });
}
