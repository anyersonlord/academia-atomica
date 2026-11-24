import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Academia Atómica — Grupos Electrógenos",
  description:
    "Sistema cognitivo neuroeducativo y fuente técnica de verdad sobre grupos electrógenos, desde la física fundamental hasta la ingeniería de planta.",
};

const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('academia-atomica:theme');
    var theme = (stored === 'light-editorial' || stored === 'dark-lab') ? stored : 'dark-lab';
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark-lab';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-theme="dark-lab"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased selection:bg-[var(--phys-electric-surface)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
