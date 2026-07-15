import type { Metadata } from "next";
import { Silkscreen, Poppins } from "next/font/google";
import "./globals.css";

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CORE — Distrito Connect",
  description: "CORE · Distrito Connect (Embarca) — registro de horas y rentabilidad",
  // favicon.ico (16/32/48), icon.svg y apple-icon.png se enlazan solos por
  // convención de archivos de Next (viven en src/app/).
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${silkscreen.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-dc-deeper text-dc-text">
        {children}
      </body>
    </html>
  );
}
