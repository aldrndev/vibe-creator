import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {/* Dynamic Background Glows for Auth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Left side - Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-orange-500 to-rose-600 p-16 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements for brand side */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Link
            to="/"
            className="flex items-center gap-2 text-2xl font-black text-white tracking-tighter group hover:opacity-90 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 fill-primary" />
            </div>
            <span>Vibe Creator</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 space-y-6"
        >
          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
            Wujudkan Ide <br /> Menjadi Konten Viral.
          </h1>
          <p className="text-white/80 text-lg font-medium max-w-md">
            Gabung dengan ribuan kreator yang sedang membangun masa depan konten
            digital dengan AI.
          </p>
        </motion.div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm font-medium">
            © 2024 Vibe Creator. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-background/50 backdrop-blur-sm relative overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo - Visible only on smaller screens */}
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <Link
              to="/"
              className="flex items-center gap-2 text-3xl font-black tracking-tighter mb-2 group transition-opacity"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-105 transition-transform">
                <Sparkles className="text-white w-7 h-7" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-rose-600">
                Vibe Creator
              </span>
            </Link>
            <p className="text-muted-foreground font-medium text-sm">
              Creative intelligence for creators.
            </p>
          </div>

          <div className="bg-card/30 lg:bg-transparent border border-border/50 lg:border-none p-6 sm:p-0 rounded-3xl backdrop-blur-md lg:backdrop-blur-none shadow-xl lg:shadow-none">
            {children}
          </div>
        </motion.div>

        {/* Mobile Footer Credit */}
        <div className="lg:hidden mt-12">
          <p className="text-muted-foreground/60 text-xs font-medium">
            © 2024 Vibe Creator.
          </p>
        </div>
      </div>
    </div>
  );
}
