import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = {
 title: "EnMastery · PSLE Oral & Listening",
 description: "Focused Singapore PSLE English conversation, reading aloud and listening comprehension practice.",
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><AppShell>{children}</AppShell></body></html>}
