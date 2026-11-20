import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = {
 title: "EnMastery · PSLE Oral, Everyday English & Listening",
 description: "Singapore PSLE English picture conversation, everyday role-play, reading aloud and listening practice.",
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><AppShell>{children}</AppShell></body></html>}
