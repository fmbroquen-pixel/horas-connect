-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('admin', 'guest');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('presencial', 'virtual', 'valor_cero');

-- CreateEnum
CREATE TYPE "RolSesion" AS ENUM ('titular', 'acompanante', 'valor_cero');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'guest',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "mentor_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temas" (
    "id" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas" (
    "id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "rol" "RolSesion" NOT NULL,
    "valor_usd" DECIMAL(10,2) NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_horas" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "tema_id" TEXT,
    "horas" DECIMAL(5,2) NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "rol" "RolSesion" NOT NULL,
    "nota" TEXT,
    "tarifa_usd_aplicada" DECIMAL(10,2) NOT NULL,
    "monto_usd" DECIMAL(10,2) NOT NULL,
    "creado_por_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_horas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_nombre_key" ON "clientes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "mentores_email_key" ON "mentores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_mentor_id_key" ON "usuarios"("mentor_id");

-- CreateIndex
CREATE INDEX "tarifas_mentor_id_modalidad_rol_vigente_hasta_idx" ON "tarifas"("mentor_id", "modalidad", "rol", "vigente_hasta");

-- CreateIndex
CREATE UNIQUE INDEX "tarifas_mentor_id_modalidad_rol_vigente_desde_key" ON "tarifas"("mentor_id", "modalidad", "rol", "vigente_desde");

-- CreateIndex
CREATE INDEX "registros_horas_fecha_idx" ON "registros_horas"("fecha");

-- CreateIndex
CREATE INDEX "registros_horas_mentor_id_fecha_idx" ON "registros_horas"("mentor_id", "fecha");

-- CreateIndex
CREATE INDEX "registros_horas_cliente_id_fecha_idx" ON "registros_horas"("cliente_id", "fecha");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_tema_id_fkey" FOREIGN KEY ("tema_id") REFERENCES "temas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
