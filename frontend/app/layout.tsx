import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TruthGuard AI - AI-Powered Fact Checking",
  description:
    "Combat misinformation with AI-powered fact-checking, community discussion, and automated verification tools.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${inter.className} relative min-h-screen overflow-x-hidden text-slate-800 transition-colors duration-500 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:text-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900`}
      >
        {/* ✅ Theme Provider for Dark/Light Mode */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>
            {/* ✨ Background Gradient Layer */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute top-[-200px] left-[-150px] w-[600px] h-[600px] bg-gradient-to-br from-indigo-300 via-blue-200 to-cyan-100 dark:from-indigo-900 dark:via-blue-900 dark:to-cyan-800 rounded-full blur-[160px] opacity-60 animate-pulse-slow"></div>
              <div className="absolute bottom-[-200px] right-[-150px] w-[600px] h-[600px] bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-100 dark:from-pink-900 dark:via-purple-900 dark:to-indigo-900 rounded-full blur-[160px] opacity-60 animate-pulse-slow"></div>
              <div className="absolute top-[30%] left-[60%] w-[400px] h-[400px] bg-gradient-to-tr from-blue-100 via-indigo-100 to-cyan-50 dark:from-blue-900 dark:via-indigo-900 dark:to-cyan-800 rounded-full blur-[120px] opacity-50 animate-pulse-slower"></div>
            </div>

            {/* 🌐 Main Content Wrapper */}
            <div className="relative z-10 flex flex-col min-h-screen">
              <Navigation />
              <div className="h-16 md:h-[4.5rem]" />
              <main className="flex-1 mx-auto w-[95%] max-w-7xl px-3 sm:px-4 lg:px-8 py-6 md:py-8">
                {children}
              </main>
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
