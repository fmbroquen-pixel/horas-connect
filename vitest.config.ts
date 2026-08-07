import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Los tests cubren la lógica pura: aritmética de días hábiles, secuenciación
// del Roadmap, formato de horas y armado de la curva. Nada que toque la base
// —eso se verifica contra datos reales, no con un Postgres de mentira— así
// que el entorno es node y no hace falta jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
