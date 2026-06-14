import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "CompTIA DA0-002 Exam",
  description: "Hệ thống thi thử và quản lý DA0-002",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Ép mặc định là Dark Mode ngay từ khi server trả HTML về
    <html lang="vi" className="dark">
      <body className={`${inter.className} antialiased bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        {children}
      </body>
    </html>
  );
}