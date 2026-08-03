import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Nav from "@/components/Nav";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
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
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MotionProvider>
          <Nav />
          <main className="flex-1">{children}</main>
        </MotionProvider>
      </body>
    </html>
  );
}
