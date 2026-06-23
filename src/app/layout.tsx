import type { Metadata } from "next";
import "./globals.css";
import Providers from "../components/providers";
import Navbar from "../components/Navbar";
import ToastContainer from "../components/ui/Toast";

export const metadata: Metadata = {
  title: "TreasuryDAO - Community Treasury Management DApp",
  description: "A secure, transparent, and decentralized community treasury governance system powered by Soroban on Stellar Testnet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
            {children}
          </main>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
