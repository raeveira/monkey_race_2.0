import type { Metadata } from "next";
import "./globals.css";
import {cn} from "@/lib/utils";
import localFont from "next/font/local";
import React from "react";

const LowresPixelFont = localFont({src: '../../public/fonts/LowresPixel-Regular.otf'})

export const metadata: Metadata = {
  title: "Monkey Race",
  description: "A math game about monkeys racing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(LowresPixelFont.className, 'antialiased')}
      >
        {children}
      </body>
    </html>
  );
}
