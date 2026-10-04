import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={
 title:"KaamYab — Local services marketplace",
 description:"A bilingual local-services marketplace for Pakistan with voice-assisted job requests, nearby worker offers and reputation-based choice.",
 manifest:"/manifest.webmanifest"
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
