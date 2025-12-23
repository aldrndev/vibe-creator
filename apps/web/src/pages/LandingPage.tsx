import { Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Video, 
  Mic, 
  Download, 
  BarChart3, 
  Radio,
  ArrowRight,
  Check
} from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { Moon, Sun } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-divider bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold gradient-text">Vibe Creator</span>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Fitur
            </a>
            <a href="#pricing" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Harga
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="light"
              onPress={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button as={Link} to="/login" variant="light">
              Masuk
            </Button>
            <Button as={Link} to="/register" color="primary">
              Daftar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-primary bg-primary/10 rounded-full">
            ✨ Platform All-in-One untuk Content Creator
          </span>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Buat Konten Luar Biasa,
            <br />
            <span className="gradient-text">Dari Ide Hingga Export</span>
          </h1>
          
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto mb-8">
            Vibe Creator adalah platform all-in-one yang mengakomodasi segala kebutuhan 
            daily content creative. Prompt builder, video editor, voice recording, 
            dan banyak lagi dalam satu tempat.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              as={Link} 
              to="/register" 
              color="primary" 
              size="lg"
              endContent={<ArrowRight size={20} />}
            >
              Mulai Gratis
            </Button>
            <Button 
              as={Link} 
              to="#features" 
              variant="bordered" 
              size="lg"
            >
              Lihat Fitur
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Semua yang Kamu Butuhkan
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Fitur lengkap untuk membantu kamu membuat konten yang menarik dan berkualitas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-xl border border-divider bg-content1 hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="text-primary" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-foreground/70 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Harga Sederhana & Transparan
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Pilih plan yang sesuai dengan kebutuhanmu. Upgrade atau downgrade kapan saja.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-6 rounded-xl border ${
                plan.popular 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                  : 'border-divider bg-content1'
              }`}
            >
              {plan.popular && (
                <span className="inline-block px-3 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full mb-4">
                  Populer
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-foreground/60">{plan.period}</span>
                )}
              </div>
              <p className="text-foreground/70 text-sm mb-6">{plan.description}</p>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                as={Link}
                to="/register"
                color={plan.popular ? 'primary' : 'default'}
                variant={plan.popular ? 'solid' : 'bordered'}
                fullWidth
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center p-12 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Membuat Konten Luar Biasa?
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Bergabung dengan ribuan content creator yang sudah menggunakan Vibe Creator.
          </p>
          <Button 
            as={Link} 
            to="/register" 
            size="lg"
            className="bg-white text-primary font-semibold"
          >
            Mulai Gratis Sekarang
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-divider py-8">
        <div className="container mx-auto px-4 text-center text-sm text-foreground/60">
          <p>© 2024 Vibe Creator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
