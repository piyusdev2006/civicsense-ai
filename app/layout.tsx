import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CivicSense AI | Citizen Grievance Assistant",
  description: "AI-powered municipal routing using AWS Bedrock",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <nav className="bg-blue-900 text-white p-4 shadow-md">
          <div className="max-w-5xl mx-auto font-bold text-xl flex justify-between">
            <span>🏛️ CivicSense AI</span>
            <a href="/dashboard" className="text-sm font-medium hover:underline mt-1">Live Dashboard</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
