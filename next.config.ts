import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos de perfil se comprimen en el cliente antes de enviarse, pero
    // subimos este límite como red de seguridad: el default de Server Actions
    // es 1 MB y cualquier imagen mayor rompía el request antes de llegar a la
    // acción (pantalla "This page couldn't load").
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
