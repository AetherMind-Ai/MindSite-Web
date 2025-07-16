/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata, Viewport } from "next";
import { Inter, PT_Sans } from "next/font/google";
import { cookies } from "next/headers";

import TanstackProvider from "@/components/providers/tanstack-query-provider";
import "@/assets/globals.css";
import { Toaster } from "@/components/ui/sonner";
import MY_TOKEN_KEY from "@/lib/get-cookie-name";
import { apiServer } from "@/lib/api";
import AppContext from "@/components/contexts/app-context";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const ptSans = PT_Sans({
  variable: "--font-ptSans-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "MindSite | Build with AI ✨",
  description:
    "MindSite is a web development tool that helps you build websites with AI, no code required. Let's deploy your website with MindSite and enjoy the magic of AI.",
  openGraph: {
    title: "MindSite | Build with AI ✨",
    description:
      "MindSite is a web development tool that helps you build websites with AI, no code required. Let's deploy your website with MindSite and enjoy the magic of AI.",
    url: "https://MindSite.hf.co",
    siteName: "MindSite",
    images: [
      {
        url: "https://i.ibb.co/WN7mYdLt/logo.png",
        width: 1200,
        height: 630,
        alt: "MindSite Open Graph Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MindSite | Build with AI ✨",
    description:
      "MindSite is a web development tool that helps you build websites with AI, no code required. Let's deploy your website with MindSite and enjoy the magic of AI.",
    images: ["https://i.ibb.co/WN7mYdLt/logo.png"],
  },
  appleWebApp: {
    capable: true,
    title: "MindSite",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "https://i.ibb.co/WN7mYdLt/logo.png",
    shortcut: "https://i.ibb.co/WN7mYdLt/logo.png",
    apple: "https://i.ibb.co/WN7mYdLt/logo.png",
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

async function getMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MY_TOKEN_KEY())?.value;
  if (!token) return { user: null, errCode: null };
  try {
    const res = await apiServer.get("/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { user: res.data.user, errCode: null };
  } catch (err: any) {
    return { user: null, errCode: err.status };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getMe();
  return (
    <html lang="en">
      <Script
        defer
        data-domain="MindSite.hf.co"
        src="https://plausible.io/js/script.js"
      ></Script>
      <body
        className={`${inter.variable} ${ptSans.variable} antialiased bg-black dark h-[100dvh] overflow-hidden`}
      >
        <Toaster richColors position="bottom-center" />
        <TanstackProvider>
          <AppContext me={data}>{children}</AppContext>
        </TanstackProvider>
      </body>
    </html>
  );
}
