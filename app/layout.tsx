import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Room to Mind",
  description:
    "Measures the attention load of a physical space across a visual and an acoustic channel, entirely in your browser.",
};

/**
 * Apply the remembered palette before first paint.
 *
 * Without this the page renders bright and then dims a frame later, which is a
 * flash of exactly the light the recovery palette exists to avoid. Inline and
 * synchronous on purpose.
 */
const NO_FLASH = `try{if(localStorage.getItem('rtm:theme')==='recovery'){document.documentElement.setAttribute('data-theme','recovery')}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
