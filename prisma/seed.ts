import "dotenv/config";
import { PrismaClient, Modalidad, RolSesion } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CLIENTES = [
  "Andreu",
  "ArgPex",
  "Conosur",
  "COV",
  "Embarca",
  "Farmacias Villegas",
  "IUCE",
  "Lila",
  "Lujan Agricola",
  "Nites",
  "Sandra Marzzan",
  "Santoni",
  "Valos",
  "Rule Retali",
  "Oftar",
  "Valca",
];

const TEMAS: { etiqueta: string; grupo: string }[] = [
  { etiqueta: "Kickoff", grupo: "Kickoff / Onboarding" },
  { etiqueta: "Nuevo seteo", grupo: "Kickoff / Onboarding" },
  { etiqueta: "Seteo trimestral", grupo: "Kickoff / Onboarding" },
  { etiqueta: "One on one (OH)", grupo: "Seguimiento / 1:1" },
  { etiqueta: "1:1", grupo: "Seguimiento / 1:1" },
  { etiqueta: "Seguimiento de gestión", grupo: "Seguimiento / 1:1" },
  { etiqueta: "Retrospectiva", grupo: "Cierre / Retrospectiva" },
  { etiqueta: "Cierre de tablero", grupo: "Cierre / Retrospectiva" },
  { etiqueta: "Gestión / lanzamiento", grupo: "Gestión / Dirección" },
  { etiqueta: "Directorio", grupo: "Gestión / Dirección" },
  { etiqueta: "Reunión de estrategia y presupuesto", grupo: "Gestión / Dirección" },
  { etiqueta: "Certificación", grupo: "Certificación / Capacitación" },
  { etiqueta: "Capacitación", grupo: "Certificación / Capacitación" },
  { etiqueta: "Viaje / traslado", grupo: "Administrativo / Interno" },
  { etiqueta: "Tarea interna Embarca", grupo: "Administrativo / Interno" },
  { etiqueta: "Otro", grupo: "Otro" },
];

const MENTORES = [
  { nombre: "David", email: "david@embarca.tech", rol: "guest" as const },
  {
    nombre: "Lucas Flores",
    email: "lucas.flores@embarca.tech",
    rol: "guest" as const,
  },
  { nombre: "Maxi", email: "maxi@embarca.tech", rol: "guest" as const },
  { nombre: "Lucas", email: "lucas@embarca.tech", rol: "guest" as const },
  { nombre: "Fede", email: "fede@embarca.tech", rol: "admin" as const },
];

async function main() {
  for (const nombre of CLIENTES) {
    await prisma.cliente.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  for (const tema of TEMAS) {
    const existente = await prisma.tema.findFirst({
      where: { etiqueta: tema.etiqueta },
    });
    if (!existente) {
      await prisma.tema.create({ data: tema });
    }
  }

  const mentoresCreados: Record<string, string> = {};
  for (const m of MENTORES) {
    const mentor = await prisma.mentor.upsert({
      where: { email: m.email },
      update: {},
      create: { nombre: m.nombre, email: m.email },
    });
    mentoresCreados[m.email] = mentor.id;

    await prisma.usuario.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        nombre: m.nombre,
        rol: m.rol,
        mentorId: mentor.id,
      },
    });
  }

  // Convenio de David: varía por modalidad y rol.
  const davidId = mentoresCreados["david@embarca.tech"];
  const tarifasDavid: { modalidad: Modalidad; rol: RolSesion; valorUsd: number }[] = [
    { modalidad: "presencial", rol: "titular", valorUsd: 45 },
    { modalidad: "presencial", rol: "acompanante", valorUsd: 30 },
    { modalidad: "virtual", rol: "titular", valorUsd: 37.5 },
    { modalidad: "virtual", rol: "acompanante", valorUsd: 25 },
    { modalidad: "valor_cero", rol: "valor_cero", valorUsd: 0 },
  ];
  for (const t of tarifasDavid) {
    await crearTarifaSiNoExiste(davidId, t.modalidad, t.rol, t.valorUsd);
  }

  // Convenio de Lucas Flores: tarifa fija de USD 30/hora, sin importar
  // modalidad ni rol (salvo "valor cero", que siempre es $0).
  const lucasFloresId = mentoresCreados["lucas.flores@embarca.tech"];
  const combinacionesLucasFlores: { modalidad: Modalidad; rol: RolSesion; valorUsd: number }[] = [
    { modalidad: "presencial", rol: "titular", valorUsd: 30 },
    { modalidad: "presencial", rol: "acompanante", valorUsd: 30 },
    { modalidad: "virtual", rol: "titular", valorUsd: 30 },
    { modalidad: "virtual", rol: "acompanante", valorUsd: 30 },
    { modalidad: "valor_cero", rol: "valor_cero", valorUsd: 0 },
  ];
  for (const t of combinacionesLucasFlores) {
    await crearTarifaSiNoExiste(lucasFloresId, t.modalidad, t.rol, t.valorUsd);
  }

  // Maxi, Lucas y Fede quedan creados como mentores pero sin tarifa todavía:
  // falta que Fede (admin) confirme sus convenios para cargarlos en la Fase 1.

  console.log("Seed completado.");
}

async function crearTarifaSiNoExiste(
  mentorId: string,
  modalidad: Modalidad,
  rol: RolSesion,
  valorUsd: number,
) {
  const vigente = await prisma.tarifa.findFirst({
    where: { mentorId, modalidad, rol, vigenteHasta: null },
  });
  if (!vigente) {
    await prisma.tarifa.create({
      data: { mentorId, modalidad, rol, valorUsd },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
