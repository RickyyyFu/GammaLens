import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GammaLens · 期权结构研究终端",
    template: "%s · GammaLens",
  },
  description: "开放访问的期权结构研究终端：清楚标注数据来源、时效、覆盖率与模型假设。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
