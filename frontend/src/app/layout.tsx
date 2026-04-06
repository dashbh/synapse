import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MessageProcessorProvider } from "@/a2ui/processor/MessageProcessorProvider";
import { PlatformShell } from "@/platform/shell/PlatformShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A2UI Platform",
  description: "Agent-generated UI platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <MessageProcessorProvider>
          <PlatformShell>{children}</PlatformShell>
        </MessageProcessorProvider>
      </body>
    </html>
  );
}
