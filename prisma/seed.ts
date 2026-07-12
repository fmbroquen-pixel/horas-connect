import "dotenv/config";
import { PrismaClient, Modalidad, Ownership } from "../src/generated/prisma/client";
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

const ETAPAS: { etiqueta: string; grupo: string }[] = [
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

// El "mentor" es, en el modelo de datos, un Usuario con rol "guest": no hay
// una tabla aparte para lo mismo.
const USUARIOS = [
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

  for (const etapa of ETAPAS) {
    const existente = await prisma.etapa.findFirst({
      where: { etiqueta: etapa.etiqueta },
    });
    if (!existente) {
      await prisma.etapa.create({ data: etapa });
    }
  }

  const usuariosCreados: Record<string, string> = {};
  for (const u of USUARIOS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { nombre: u.nombre, email: u.email, rol: u.rol },
    });
    usuariosCreados[u.email] = usuario.id;
  }

  // Convenio de David: tarifa variable (una combinación por modalidad x rol).
  const davidId = usuariosCreados["david@embarca.tech"];
  await prisma.usuario.update({
    where: { id: davidId },
    data: { tipoTarifa: "variable" },
  });
  const tarifasDavid: { modalidad: Modalidad; ownership: Ownership; valorUsd: number }[] = [
    { modalidad: "presencial", ownership: "owner", valorUsd: 45 },
    { modalidad: "presencial", ownership: "backup", valorUsd: 30 },
    { modalidad: "virtual", ownership: "owner", valorUsd: 37.5 },
    { modalidad: "virtual", ownership: "backup", valorUsd: 25 },
    { modalidad: "valor_cero", ownership: "valor_cero", valorUsd: 0 },
  ];
  for (const t of tarifasDavid) {
    await crearTarifaSiNoExiste(davidId, t.modalidad, t.ownership, t.valorUsd);
  }

  // Convenio de Lucas Flores: tarifa fija de USD 30/hora, sin importar
  // modalidad ni rol (salvo "valor cero", que siempre es $0). Se guarda
  // igual como una fila de Tarifa por combinación para que el cálculo de
  // horas no tenga que distinguir fija/variable, solo cambia qué formulario
  // ve el administrador.
  const lucasFloresId = usuariosCreados["lucas.flores@embarca.tech"];
  await prisma.usuario.update({
    where: { id: lucasFloresId },
    data: { tipoTarifa: "fija" },
  });
  const combinacionesLucasFlores: { modalidad: Modalidad; ownership: Ownership; valorUsd: number }[] = [
    { modalidad: "presencial", ownership: "owner", valorUsd: 30 },
    { modalidad: "presencial", ownership: "backup", valorUsd: 30 },
    { modalidad: "virtual", ownership: "owner", valorUsd: 30 },
    { modalidad: "virtual", ownership: "backup", valorUsd: 30 },
    { modalidad: "valor_cero", ownership: "valor_cero", valorUsd: 0 },
  ];
  for (const t of combinacionesLucasFlores) {
    await crearTarifaSiNoExiste(lucasFloresId, t.modalidad, t.ownership, t.valorUsd);
  }

  // Maxi y Lucas quedan creados con tipoTarifa sin definir (null): no pueden
  // cargar horas facturables hasta que el administrador les configure
  // "fija" o "variable" desde el ABM de Usuarios.

  console.log("Seed completado.");
}

async function crearTarifaSiNoExiste(
  usuarioId: string,
  modalidad: Modalidad,
  ownership: Ownership,
  valorUsd: number,
) {
  const vigente = await prisma.tarifa.findFirst({
    where: { usuarioId, modalidad, ownership, vigenteHasta: null },
  });
  if (!vigente) {
    await prisma.tarifa.create({
      data: { usuarioId, modalidad, ownership, valorUsd },
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
