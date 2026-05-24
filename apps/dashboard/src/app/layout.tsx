import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Lunaria Console",
  description: "Discord community operations dashboard for Lunaria."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

