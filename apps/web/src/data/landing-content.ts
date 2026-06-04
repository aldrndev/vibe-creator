import { Download, Radio, Repeat, Sparkles, TrendingUp, Video, Wand2 } from 'lucide-react';

export const landingProductFeatures = [
  {
    icon: Sparkles,
    title: 'AI Director',
    description:
      'Import video atau link trending, pilih durasi short, lalu biarkan AI menyiapkan analisis.',
  },
  {
    icon: Wand2,
    title: 'Video Studio',
    description:
      'Edit timeline, layer, text, audio, thumbnail, background, dan export dalam satu workspace.',
  },
  {
    icon: Repeat,
    title: 'Loop Creator',
    description:
      'Perpanjang video ambience atau relaxing clip menjadi long-loop video siap publish.',
  },
  {
    icon: Video,
    title: 'Reaction Recorder',
    description:
      'Record webcam/mic sambil menonton video utama, atau upload reaction yang sudah ada.',
  },
  {
    icon: Radio,
    title: 'Live Streaming',
    description: 'Loop video ke YouTube, TikTok, Twitch, Facebook, Instagram, atau custom RTMP.',
  },
  {
    icon: TrendingUp,
    title: 'Trending',
    description: 'Pantau video YouTube viral per negara dan mulai short dari ide yang sedang naik.',
  },
] as const;

export const landingWorkflows = [
  {
    label: 'Temukan ide',
    description: 'Mulai dari Trending, video YouTube, atau source video sendiri.',
  },
  {
    label: 'Buat/Import video',
    description: 'Masukkan source ke AI Director, Video Studio, Loop, Reaction, atau Live.',
  },
  {
    label: 'Edit/Record/Loop',
    description: 'Poles timeline, record reaction, buat loop panjang, atau siapkan stream.',
  },
  {
    label: 'Export/Download/Live',
    description: 'Ambil hasil export, lanjutkan draft, atau siarkan video langsung.',
  },
] as const;

export const landingPricingPlans = [
  {
    id: 'FREE',
    name: 'Free',
    price: 'Rp 0',
    period: 'selamanya',
    description: 'Untuk mencoba workflow creator dari ide sampai export ringan.',
    cta: 'Mulai Gratis',
    features: [
      '5 export setiap bulan',
      'Resolusi 720p dengan watermark',
      'Video Studio untuk edit dasar',
      'AI Director starter',
      'Riwayat project aktif',
    ],
    popular: false,
  },
  {
    id: 'CREATOR',
    name: 'Creator',
    price: 'Rp 99.000',
    period: '/bulan',
    description: 'Untuk content creator aktif yang rutin membuat short dan video sosial.',
    cta: 'Pilih Creator',
    features: [
      '50 export setiap bulan',
      'Resolusi 1080p Full HD',
      'Tanpa watermark',
      'Loop Creator dan Reaction Recorder',
      'Support prioritas',
    ],
    popular: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 'Rp 199.000',
    period: '/bulan',
    description: 'Untuk profesional, studio, dan workflow produksi volume tinggi.',
    cta: 'Pilih Pro',
    features: [
      'Export unlimited',
      'Resolusi hingga 4K',
      'Tanpa watermark',
      'Semua tool premium',
      'Priority render',
      'Live Streaming quota besar',
    ],
    popular: false,
  },
] as const;

export const landingFooterGroups = [
  {
    title: 'Produk',
    links: [
      { label: 'Fitur', section: 'features' },
      { label: 'Workflow', section: 'workflow' },
      { label: 'Harga', section: 'pricing' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
    ],
  },
] as const;

export const aboutHighlights = [
  {
    icon: Sparkles,
    title: 'Dari ide ke short',
    description: 'Trending YouTube dan AI Director membantu memulai ide tanpa setup panjang.',
  },
  {
    icon: Wand2,
    title: 'Editor tetap lengkap',
    description: 'Video Studio menangani timeline, layer, text, audio, background, dan export.',
  },
  {
    icon: Repeat,
    title: 'Workflow khusus creator',
    description: 'Loop Creator, Reaction Recorder, dan Live Streaming melengkapi kebutuhan harian.',
  },
  {
    icon: Download,
    title: 'Project dan download rapi',
    description: 'Draft, session, export, dan download dikelola dalam satu riwayat workspace.',
  },
] as const;
