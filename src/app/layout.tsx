import type { Metadata } from "next";
import { Bodoni_Moda, DM_Sans } from "next/font/google";
import Nav from "@/components/Nav";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MODO: Data-Driven Buy Planning",
  description:
    "Forecast demand and build quarterly buy plans from historic orders, catalog data, and fashion trend signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bodoni.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MotionProvider>
          <Nav />
          <main className="flex-1">{children}</main>
        </MotionProvider>
      </body>
    </html>
  );
}
