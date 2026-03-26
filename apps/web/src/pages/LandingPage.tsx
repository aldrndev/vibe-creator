import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Check,
  Download,
  Menu,
  Mic,
  Moon,
  Radio,
  Sparkles,
  Sun,
  Video,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/theme-store';

const features = [
  {
    icon: Sparkles,
    title: 'Prompt Builder',
    description: 'Generate script, voice, video, dan image prompt yang detail dan siap pakai.',
  },
  {
    icon: Video,
    title: 'Video Editor',
    description: 'Edit video dengan mudah - cut, trim, dan tambahkan voice over.',
  },
  {
    icon: Mic,
    title: 'Voice Recording',
    description: 'Rekam suara langsung atau import audio untuk dubbing.',
  },
  {
    icon: Download,
    title: 'URL Import',
    description: 'Download video dari YouTube, TikTok, Instagram, dan Facebook.',
  },
  {
    icon: BarChart3,
    title: 'Creative Scan',
    description: 'Analisis video kompetitor dan dapatkan insight untuk konten lebih baik.',
  },
  {
    icon: Radio,
    title: 'Live Streaming',
    description: 'Setup live streaming ke multiple platform sekaligus.',
  },
];

const pricingPlans = [
  {
    name: 'Gratis',
    price: 'Rp 0',
    description: 'Untuk mencoba fitur dasar',
    features: [
      'Preview penuh',
      'Prompt Builder lengkap',
      'Edit video',
      'URL Import',
      'Rekam suara',
    ],
    cta: 'Mulai Gratis',
    popular: false,
  },
  {
    name: 'Creator',
    price: 'Rp 99.000',
    period: '/bulan',
    description: 'Untuk content creator aktif',
    features: [
      'Semua fitur Gratis',
      'Export 720p-1080p',
      '20 export/bulan',
      'Tanpa watermark',
      'Priority support',
    ],
    cta: 'Mulai Creator',
    popular: true,
  },
  {
    name: 'Pro',
    price: 'Rp 249.000',
    period: '/bulan',
    description: 'Untuk professional & agency',
    features: [
      'Semua fitur Creator',
      'Export hingga 4K',
      'Unlimited export',
      'Priority queue',
      'Live streaming',
    ],
    cta: 'Mulai Pro',
    popular: false,
  },
];

export function LandingPage() {
  const { theme, toggleTheme } = useThemeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: 'features' | 'pricing') => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Dynamic Background Glows - Subtle & Balanced */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[130px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90"
          >
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600 tracking-tighter">
              Vibe Creator
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Fitur
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Harga
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </Button>

            <div className="hidden sm:flex items-center gap-3">
              <Button variant="ghost" asChild className="rounded-full">
                <Link to="/login">Masuk</Link>
              </Button>
              <Button asChild className="rounded-full px-6 transition-all font-bold">
                <Link to="/register">Mulai Sekarang</Link>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-full"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden absolute top-20 left-0 right-0 bg-background border-b border-border p-6 space-y-6 z-50 shadow-2xl"
          >
            <nav className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="text-lg font-medium text-left"
              >
                Fitur
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="text-lg font-medium text-left"
              >
                Harga
              </button>
            </nav>
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <Button variant="outline" asChild className="w-full rounded-xl justify-center">
                <Link to="/login">Masuk</Link>
              </Button>
              <Button asChild className="w-full rounded-xl justify-center font-bold">
                <Link to="/register">Daftar Sekarang</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-semibold tracking-wide uppercase text-primary bg-primary/10 rounded-full border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>{' '}
              Next-Gen AI Video Platform
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 sm:mb-8 tracking-tight leading-[1.1]">
              Buat Konten Luar Biasa, <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-orange-400 to-rose-600 animate-gradient">
                Tanpa Hambatan
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-medium px-4 sm:px-0">
              Vibe Creator adalah workspace cerdas untuk para konten kreator. Gabungkan AI video,
              automasi script, dan toolkit editing profesional dalam satu platform intuitif.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
              <Button
                size="lg"
                asChild
                className="h-14 px-8 rounded-full text-base font-bold shadow-md hover:shadow-lg transition-all group"
              >
                <Link to="/register" className="flex items-center gap-3">
                  Buat Konten Gratis
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-14 px-8 rounded-full text-base font-semibold border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                <a href="#features">Pelajari Fitur</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 sm:py-32 bg-secondary/10 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center mb-16 lg:mb-24">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                Kreativitas Tanpa Batas <br />
                dengan Kecerdasan <span className="text-primary">AI</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Platform kami memberikan Anda kekuatan untuk memproduksi konten berkualitas tinggi
                dalam hitungan menit, bukan jam. Semua fitur dirancang untuk mempercepat alur kerja
                Anda.
              </p>

              <div className="grid gap-6">
                {[
                  {
                    title: 'AI-Powered Storyboard',
                    desc: 'Ubah ide kasar menjadi struktur video yang matang.',
                  },
                  {
                    title: 'One-Click Optimization',
                    desc: 'Optimalkan video untuk setiap platform media sosial.',
                  },
                  {
                    title: 'Real-time Collaboration',
                    desc: 'Bekerja sama dengan tim secara langsung di editor.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 items-start p-4 rounded-2xl bg-muted/50 border border-border hover:ring-2 hover:ring-primary hover:border-transparent transition-all cursor-default group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all text-primary">
                      <Check size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary hover:border-transparent transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary transition-all">
                    <feature.icon className="text-primary group-hover:text-primary-foreground w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed opacity-80">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sophisticated Pricing */}
      <section id="pricing" className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-6 text-center">
          <div className="mb-20 space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Investasi Untuk Karir Anda
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Plan yang fleksibel untuk setiap tahap perjalanan Anda sebagai kreator.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={cn(
                  'relative flex flex-col p-8 sm:p-10 rounded-2xl sm:rounded-3xl border transition-all duration-300',
                  plan.popular
                    ? 'bg-card border-primary shadow-xl sm:scale-105 z-20 ring-1 ring-primary/20'
                    : 'bg-card border-border shadow-sm z-10',
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 p-4">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground rounded-full shadow-sm">
                      Paling Populer
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-6 text-left">{plan.name}</h3>

                <div className="text-left mb-8">
                  <span className="text-5xl font-black">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm ml-2 font-medium text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </div>

                <p className="text-left mb-10 text-sm leading-relaxed font-medium text-muted-foreground">
                  {plan.description}
                </p>

                <ul className="space-y-5 mb-auto">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm font-medium">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                          plan.popular ? 'bg-white/20' : 'bg-primary/10',
                        )}
                      >
                        <Check size={12} className="text-primary" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? 'default' : 'outline'}
                  className="mt-12 h-14 rounded-full text-base font-bold transition-all shadow-sm active:scale-95"
                  asChild
                >
                  <Link to="/register">{plan.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-4xl bg-primary p-8 sm:p-12 md:p-24 text-center text-primary-foreground shadow-xl">
          <div className="relative z-10 space-y-8 sm:space-y-10">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter max-w-3xl mx-auto leading-[1.1]">
              Mulai Petualangan <br className="hidden sm:block" />
              Kreatif Anda Hari Ini.
            </h2>
            <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto font-medium">
              Tidak perlu kartu kredit. Hanya butuh satu visi untuk mengubah dunia dengan konten
              Anda.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="h-14 sm:h-16 px-8 sm:px-12 rounded-full text-base sm:text-lg font-black bg-background text-foreground shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <Link to="/register">Daftar Sekarang - Gratis 100%</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-white/5 py-16 bg-background/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Sparkles className="text-primary-foreground w-4 h-4" />
              </div>
              <span className="font-bold">Vibe Creator</span>
            </div>

            <div className="flex gap-8 text-sm font-medium text-muted-foreground">
              <a href="/terms" className="hover:text-primary">
                Term of Service
              </a>
              <a href="/privacy" className="hover:text-primary">
                Privacy Policy
              </a>
              <a href="/help" className="hover:text-primary">
                Help Center
              </a>
            </div>

            <div className="text-sm text-muted-foreground font-medium">
              © 2024 Vibe Creator. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
