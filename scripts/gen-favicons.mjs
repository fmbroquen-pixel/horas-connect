// Genera los assets de favicon a partir de src/app/icon.svg.
// Uso: node scripts/gen-favicons.mjs
//
// Produce:
//   src/app/favicon.ico          (16 + 32 + 48, PNGs embebidos)
//   src/app/apple-icon.png       (180x180, fondo sólido: iOS no admite alfa)
//   public/favicon-16x16.png / favicon-32x32.png / favicon-48x48.png
//   public/icon-192.png / icon-512.png  (PWA / manifest)
//   public/site.webmanifest
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const SVG = "src/app/icon.svg";
const FONDO_APPLE = "#18154a"; // dc-deep

const svg = await readFile(SVG);

async function png(size) {
  return sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toBuffer();
}

// ICO con PNGs embebidos (soportado por todos los navegadores actuales).
function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: icono
  header.writeUInt16LE(count, 4);

  const dirs = [];
  const imgs = [];
  let offset = 6 + 16 * count;
  for (const { size, buf } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0); // ancho (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, 1); // alto
    dir.writeUInt8(0, 2); // paleta
    dir.writeUInt8(0, 3); // reservado
    dir.writeUInt16LE(1, 4); // planos
    dir.writeUInt16LE(32, 6); // bits por píxel
    dir.writeUInt32LE(buf.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += buf.length;
    dirs.push(dir);
    imgs.push(buf);
  }
  return Buffer.concat([header, ...dirs, ...imgs]);
}

await mkdir("public", { recursive: true });

// PNGs sueltos.
const tam = { 16: null, 32: null, 48: null, 192: null, 512: null };
for (const size of Object.keys(tam).map(Number)) {
  tam[size] = await png(size);
}
await writeFile("public/favicon-16x16.png", tam[16]);
await writeFile("public/favicon-32x32.png", tam[32]);
await writeFile("public/favicon-48x48.png", tam[48]);
await writeFile("public/icon-192.png", tam[192]);
await writeFile("public/icon-512.png", tam[512]);

// favicon.ico multitamaño.
await writeFile(
  "src/app/favicon.ico",
  buildIco([
    { size: 16, buf: tam[16] },
    { size: 32, buf: tam[32] },
    { size: 48, buf: tam[48] },
  ]),
);

// apple-touch-icon: fondo sólido (iOS rellena el alfa con negro) y un leve
// padding para que el disco no toque el borde al redondear esquinas.
const inner = await sharp(svg, { density: 300 }).resize(150, 150).png().toBuffer();
const apple = await sharp({
  create: { width: 180, height: 180, channels: 4, background: FONDO_APPLE },
})
  .composite([{ input: inner, left: 15, top: 15 }])
  .png()
  .toBuffer();
await writeFile("src/app/apple-icon.png", apple);

// Manifest básico para Android/PWA.
await writeFile(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: "CORE — Distrito Connect",
      short_name: "CORE",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: "#18154a",
      background_color: "#100d38",
      display: "standalone",
    },
    null,
    2,
  ) + "\n",
);

console.log("OK: favicon.ico, apple-icon.png, PNGs 16/32/48/192/512, manifest");
