import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bramhand | Dining & Restaurant",
  description: "A refined restaurant service and dining management experience.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18352c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi" className={`${outfit.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-full font-sans text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
