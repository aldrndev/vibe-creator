import { FileText, Image, Mic, Music, Scan, Sparkles, User, Video } from 'lucide-react';

export const promptTypes = [
  {
    key: 'SCRIPT',
    label: 'Script / Ide',
    description: 'Generate script dan storytelling',
    icon: Sparkles,
  },
  {
    key: 'VOICE',
    label: 'Voice / TTS',
    description: 'Generate prompt untuk voice-over',
    icon: Mic,
  },
  {
    key: 'VIDEO_GEN',
    label: 'Video Generation',
    description: 'Generate prompt untuk AI video',
    icon: Video,
  },
  {
    key: 'IMAGE',
    label: 'Image / Thumbnail',
    description: 'Generate prompt untuk gambar',
    icon: Image,
  },
  {
    key: 'RELAXING',
    label: 'Relaxing / Ambient',
    description: 'Generate prompt untuk audio ambient',
    icon: Music,
  },
  {
    key: 'TALKING_HEAD',
    label: 'Talking Head / Avatar',
    description: 'Generate presenter virtual (HeyGen/Synthesia)',
    icon: User,
  },
  {
    key: 'SOCIAL_COPY',
    label: 'Social Copy / Caption',
    description: 'Generate caption medsos dan hashtag viral',
    icon: FileText,
  },
  {
    key: 'CREATIVE_SCAN',
    label: 'Creative Scan',
    description: 'Analisis video kompetitor',
    icon: Scan,
  },
];

// === SCRIPT OPTIONS ===
export const niches = [
  { key: 'gaming', label: 'Gaming / Main Game' },
  { key: 'travel', label: 'Travel / Wisata' },
  { key: 'tech', label: 'Technology / Teknologi' },
  { key: 'lifestyle', label: 'Lifestyle / Gaya Hidup' },
  { key: 'food', label: 'Food & Cooking / Makanan & Masak' },
  { key: 'finance', label: 'Finance / Keuangan' },
  { key: 'education', label: 'Education / Edukasi' },
  { key: 'health', label: 'Health / Kesehatan' },
  { key: 'beauty', label: 'Beauty / Kecantikan' },
  { key: 'entertainment', label: 'Entertainment / Hiburan' },
  { key: 'business', label: 'Business / Bisnis' },
  { key: 'music', label: 'Music / Musik' },
  { key: 'sports', label: 'Sports / Olahraga' },
  { key: 'automotive', label: 'Automotive / Otomotif' },
  { key: 'fashion', label: 'Fashion / Mode' },
  { key: 'parenting', label: 'Parenting / Pengasuhan' },
  { key: 'diy', label: 'DIY & Crafts / Kerajinan' },
  { key: 'photography', label: 'Photography / Fotografi' },
  { key: 'pets', label: 'Pets & Animals / Hewan Peliharaan' },
  { key: 'news', label: 'News & Current / Berita' },
  { key: 'crypto', label: 'Crypto & Web3' },
  { key: 'ai-tech', label: 'AI & Future Tech' },
  { key: 'sustainability', label: 'Sustainable Living / Ramah Lingkungan' },
  { key: 'true-crime', label: 'True Crime / Kriminal Nyata' },
  { key: 'history', label: 'History & Facts / Sejarah & Fakta' },
];

export const targetAudiences = [
  { key: 'gen-z', label: 'Gen Z (13-25)' },
  { key: 'millennials', label: 'Millennials (26-41)' },
  { key: 'gen-x', label: 'Gen X (42-57)' },
  { key: 'professionals', label: 'Professionals / Profesional' },
  { key: 'parents', label: 'Parents / Orang Tua' },
  { key: 'students', label: 'Students / Pelajar' },
  { key: 'entrepreneurs', label: 'Entrepreneurs / Pengusaha' },
  { key: 'gamers', label: 'Gamers / Pemain Game' },
  { key: 'creators', label: 'Creators / Kreator' },
  { key: 'beginners', label: 'Beginners / Pemula' },
  { key: 'experts', label: 'Experts / Ahli' },
];

export const callToActions = [
  { key: 'subscribe', label: 'Subscribe / Langganan' },
  { key: 'like-share', label: 'Like & Share / Suka & Bagikan' },
  { key: 'comment', label: 'Comment / Komentar' },
  { key: 'visit-link', label: 'Visit Link / Kunjungi Tautan' },
  { key: 'buy-now', label: 'Buy Now / Beli Sekarang' },
  { key: 'download', label: 'Download / Unduh' },
  { key: 'sign-up', label: 'Sign Up / Daftar' },
  { key: 'watch-more', label: 'Watch More / Tonton Lagi' },
  { key: 'follow', label: 'Follow / Ikuti' },
  { key: 'try-free', label: 'Try Free / Coba Gratis' },
];

export const keyMessages = [
  { key: 'save-money', label: 'Save Money / Hemat Uang' },
  { key: 'save-time', label: 'Save Time / Hemat Waktu' },
  { key: 'learn-skill', label: 'Learn Skill / Belajar Skill' },
  { key: 'entertainment', label: 'Entertainment / Hiburan' },
  { key: 'inspiration', label: 'Inspiration / Inspirasi' },
  { key: 'problem-solving', label: 'Solving / Pemecahan Masalah' },
  { key: 'life-hack', label: 'Life Hack / Tips Hidup' },
  { key: 'review', label: 'Review / Ulasan' },
  { key: 'tutorial', label: 'Tutorial / Panduan' },
  { key: 'behind-scenes', label: 'Behind the Scenes / Di Balik Layar' },
];

export const platforms = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'linkedin', label: 'LinkedIn' },
];

export const durations = [
  { key: '15s', label: '15 detik' },
  { key: '30s', label: '30 detik' },
  { key: '60s', label: '1 menit' },
  { key: '3min', label: '3 menit' },
  { key: '10min', label: '10 menit' },
  { key: '30min', label: '30 menit' },
];

export const tones = [
  { key: 'casual', label: 'Casual / Santai' },
  { key: 'professional', label: 'Professional / Professional' },
  { key: 'humorous', label: 'Humorous / Humoris' },
  { key: 'educational', label: 'Educational / Edukatif' },
  { key: 'inspirational', label: 'Inspirational / Inspiratif' },
  { key: 'dramatic', label: 'Dramatic / Dramatis' },
];

export const contentGoals = [
  { key: 'awareness', label: 'Awareness / Kesadaran Merek' },
  { key: 'engagement', label: 'Engagement / Interaksi' },
  { key: 'conversion', label: 'Conversion / Penjualan' },
  { key: 'entertainment', label: 'Entertainment / Hiburan' },
  { key: 'education', label: 'Education / Edukasi' },
];

export const narrativeStyles = [
  { key: 'linear', label: 'Linear (Cerita langsung)' },
  { key: 'hook-problem-solution', label: 'Hook → Problem → Solution' },
  { key: 'before-after', label: 'Before/After' },
  { key: 'story-arc', label: 'Story Arc (Setup → Climax → Resolution)' },
  { key: 'listicle', label: 'Listicle (Daftar poin)' },
];

// === VOICE OPTIONS ===
export const voiceStyles = [
  { key: 'narrator', label: 'Narrator / Narator' },
  { key: 'conversational', label: 'Conversational / Percakapan' },
  { key: 'energetic', label: 'Energetic / Energik' },
  { key: 'calm', label: 'Calm / Tenang' },
  { key: 'authoritative', label: 'Authoritative / Berwibawa' },
  { key: 'friendly', label: 'Friendly / Ramah' },
  { key: 'dramatic', label: 'Dramatic / Dramatis' },
  { key: 'whisper', label: 'Whisper / Bisikan' },
  { key: 'excited', label: 'Excited / Bersemangat' },
  { key: 'professional', label: 'Professional / Profesional' },
];

export const emotions = [
  { key: 'happy', label: 'Happy / Senang' },
  { key: 'sad', label: 'Sad / Sedih' },
  { key: 'excited', label: 'Excited / Bersemangat' },
  { key: 'calm', label: 'Calm / Tenang' },
  { key: 'urgent', label: 'Urgent / Mendesak' },
  { key: 'curious', label: 'Curious / Penasaran' },
  { key: 'confident', label: 'Confident / Percaya Diri' },
  { key: 'mysterious', label: 'Mysterious / Misterius' },
  { key: 'playful', label: 'Playful / Ceria' },
  { key: 'serious', label: 'Serious / Serius' },
];

export const emphasisOptions = [
  { key: 'keywords', label: 'Keywords / Kata Kunci' },
  { key: 'statistics', label: 'Statistics / Statistik' },
  { key: 'cta', label: 'CTA / Ajakan Bertindak' },
  { key: 'questions', label: 'Questions / Pertanyaan' },
  { key: 'brand-names', label: 'Brand Names / Nama Merek' },
  { key: 'benefits', label: 'Benefits / Manfaat' },
  { key: 'problems', label: 'Problems / Masalah' },
];

export const pauseOptions = [
  { key: 'minimal', label: 'Minimal / Minimal' },
  { key: 'natural', label: 'Natural / Alami' },
  { key: 'dramatic', label: 'Dramatic / Dramatis' },
  { key: 'emphasis', label: 'For Emphasis / Penekanan' },
  { key: 'none', label: 'None / Tidak Ada' },
];

export const languages = [
  { key: 'id', label: 'Bahasa Indonesia' },
  { key: 'en', label: 'English' },
  { key: 'id-en', label: 'Indonesian-English Bilingual' },
  { key: 'local', label: 'Bahasa Daerah' },
];

export const hookStyles = [
  { key: 'question', label: 'Question Hook / Pertanyaan Penasaran' },
  { key: 'shocking-fact', label: 'Shocking Fact / Fakta Mengejutkan' },
  { key: 'visual-intro', label: 'Visual Intro / Deskripsi Visual Detik Pertama' },
  { key: 'contradiction', label: 'Contradiction / Pernyataan Kontradiktif' },
  { key: 'storytelling', label: 'Story Hook / Cerita Singkat Instan' },
];

export const motionStrengths = [
  { key: 'subtle', label: 'Subtle / Gerakan Halus' },
  { key: 'balanced', label: 'Balanced / Gerakan Seimbang' },
  { key: 'dynamic', label: 'Dynamic / Gerakan Dinamis' },
  { key: 'extreme', label: 'Extreme / Gerakan Ekstrim' },
];

export const fpsOptions = [
  { key: '24fps', label: '24 FPS (Cinematic)' },
  { key: '30fps', label: '30 FPS (Standard Vlog)' },
  { key: '60fps', label: '60 FPS (Action/Smooth)' },
];

export const cameraLenses = [
  { key: 'portrait-85mm', label: '85mm f/1.8 (Potret Bokeh)' },
  { key: 'landscape-16mm', label: '16mm f/11 (Pemandangan Lebar)' },
  { key: 'macro-100mm', label: '100mm f/2.8 (Detail Dekat/Makro)' },
  { key: 'street-35mm', label: '35mm f/5.6 (Fotografi Jalanan)' },
  { key: 'default', label: 'Default / Lensa Standar' },
];

export const relaxingBpms = [
  { key: 'slow-60', label: '60 BPM (Sangat Tenang)' },
  { key: 'lofi-90', label: '90 BPM (Irama Lo-Fi)' },
  { key: 'chill-110', label: '110 BPM (Santai/Chill)' },
  { key: 'none', label: 'Tanpa Tempo Spesifik' },
];

export const genders = [
  { key: 'male', label: 'Male / Pria' },
  { key: 'female', label: 'Female / Wanita' },
  { key: 'neutral', label: 'Neutral / Netral' },
];

export const paces = [
  { key: 'slow', label: 'Lambat' },
  { key: 'normal', label: 'Normal' },
  { key: 'fast', label: 'Cepat' },
];

// === VIDEO GEN OPTIONS ===
export const videoConcepts = [
  { key: 'product-showcase', label: 'Product Showcase / Pameran Produk' },
  { key: 'landscape', label: 'Landscape / Pemandangan' },
  { key: 'character', label: 'Character / Karakter' },
  { key: 'abstract', label: 'Abstract / Abstrak' },
  { key: 'tutorial', label: 'Tutorial / Panduan' },
  { key: 'lifestyle', label: 'Lifestyle / Gaya Hidup' },
  { key: 'action', label: 'Action Sequence / Aksi' },
  { key: 'talking-head', label: 'Talking Head / Kepala Bicara' },
  { key: 'text-animation', label: 'Text Animation / Animasi Teks' },
  { key: 'transition', label: 'Transition Effect / Transisi' },
  { key: 'music-visualizer', label: 'Music Visualizer / Visualizer Musik' },
  { key: 'micro-macro', label: 'Micro/Macro World / Mikro/Makro' },
  { key: 'underwater', label: 'Underwater / Bawah Air' },
  { key: 'space', label: 'Space/Sci-Fi / Luar Angkasa' },
];

export const videoStyles = [
  { key: 'realistic', label: 'Realistic / Realistis' },
  { key: 'cinematic', label: 'Cinematic / Sinematik' },
  { key: 'anime', label: 'Anime / Anime' },
  { key: '3d', label: '3D Render / Render 3D' },
  { key: 'cartoon', label: 'Cartoon / Kartun' },
  { key: 'vintage', label: 'Vintage / Klasik' },
  { key: 'neon', label: 'Neon / Neon' },
  { key: 'minimalist', label: 'Minimalist / Minimalis' },
  { key: 'dreamy', label: 'Dreamy / Mimpi' },
  { key: 'cyberpunk', label: 'Cyberpunk / Cyberpunk' },
  { key: 'nature-doc', label: 'Nature Doc / Dokumenter Alam' },
  { key: 'vlog', label: 'Vlog Style / Gaya Vlog' },
  { key: 'stop-motion', label: 'Stop Motion / Stop Motion' },
  { key: 'fpv-drone', label: 'FPV Drone / Drone FPV' },
  { key: 'vhs', label: 'VHS / Retro 90s' },
  { key: 'film-noir', label: 'Film Noir / Hitam Putih' },
  { key: 'isometric', label: 'Isometric 3D / Isometrik 3D' },
  { key: 'claymation', label: 'Claymation / Tanah Liat' },
];

export const cameraMovements = [
  { key: 'static', label: 'Static / Statis' },
  { key: 'pan-left', label: 'Pan Left / Pan Kiri' },
  { key: 'pan-right', label: 'Pan Right / Pan Kanan' },
  { key: 'zoom-in', label: 'Zoom In / Zoom Masuk' },
  { key: 'zoom-out', label: 'Zoom Out / Zoom Keluar' },
  { key: 'dolly', label: 'Dolly / Dolly' },
  { key: 'tracking', label: 'Tracking / Pelacakan' },
  { key: 'aerial', label: 'Aerial / Udara' },
  { key: 'pov', label: 'POV / Sudut Pandang' },
  { key: 'slow-motion', label: 'Slow Motion / Gerak Lambat' },
  { key: 'whip-pan', label: 'Whip Pan / Pan Cepat' },
  { key: 'dutch-angle', label: 'Dutch Angle / Miring' },
  { key: 'crane-shot', label: 'Crane Shot / Derek' },
  { key: 'handheld', label: 'Handheld / Genggam' },
  { key: 'bullet-time', label: 'Bullet Time / Waktu Peluru' },
];

export const lightingOptions = [
  { key: 'natural', label: 'Natural / Alami' },
  { key: 'golden-hour', label: 'Golden Hour / Jam Emas' },
  { key: 'studio', label: 'Studio / Studio' },
  { key: 'dramatic', label: 'Dramatic / Dramatis' },
  { key: 'neon', label: 'Neon / Neon' },
  { key: 'soft', label: 'Soft / Lembut' },
  { key: 'hard-shadow', label: 'Hard Shadow / Bayangan Keras' },
  { key: 'backlit', label: 'Backlit / Cahaya Belakang' },
  { key: 'moody', label: 'Moody / Murung' },
  { key: 'bright', label: 'Bright / Terang' },
  { key: 'volumetric', label: 'Volumetric Fog / Kabut Volumetrik' },
  { key: 'bioluminescent', label: 'Bioluminescent / Bioluminesensi' },
  { key: 'rembrandt', label: 'Rembrandt / Potret Rembrandt' },
  { key: 'studio-softbox', label: 'Studio Softbox / Softbox Studio' },
  { key: 'cyber-neon', label: 'Cyberpunk Neon / Neon Cyberpunk' },
];

export const moodOptions = [
  { key: 'energetic', label: 'Energetic / Energik' },
  { key: 'calm', label: 'Calm / Tenang' },
  { key: 'mysterious', label: 'Mysterious / Misterius' },
  { key: 'happy', label: 'Happy / Senang' },
  { key: 'sad', label: 'Sad / Sedih' },
  { key: 'intense', label: 'Intense / Intens' },
  { key: 'romantic', label: 'Romantic / Romantis' },
  { key: 'futuristic', label: 'Futuristic / Futuristik' },
  { key: 'nostalgic', label: 'Nostalgic / Nostalgia' },
  { key: 'epic', label: 'Epic / Epik' },
];

export const aspectRatios = [
  { key: '16:9', label: '16:9 (Landscape)' },
  { key: '9:16', label: '9:16 (Portrait)' },
  { key: '1:1', label: '1:1 (Square)' },
  { key: '4:3', label: '4:3 (Standard)' },
];

export const videoDurations = [
  { key: '5s', label: '5 detik' },
  { key: '10s', label: '10 detik' },
  { key: '15s', label: '15 detik' },
];

// === IMAGE OPTIONS ===
export const imageSubjects = [
  { key: 'person', label: 'Person / Orang' },
  { key: 'product', label: 'Product / Produk' },
  { key: 'landscape', label: 'Landscape / Pemandangan' },
  { key: 'food', label: 'Food / Makanan' },
  { key: 'animal', label: 'Animal / Hewan' },
  { key: 'abstract', label: 'Abstract / Abstrak' },
  { key: 'text-quote', label: 'Text/Quote / Teks/Kutip' },
  { key: 'infographic', label: 'Infographic / Infografis' },
  { key: 'before-after', label: 'Before/After / Sebelum/Sesudah' },
  { key: 'collage', label: 'Collage / Kolase' },
];

export const imageStyles = [
  { key: 'photorealistic', label: 'Photorealistic / Fotorealistis' },
  { key: 'digital-art', label: 'Digital Art / Seni Digital' },
  { key: 'illustration', label: 'Illustration / Ilustrasi' },
  { key: 'minimalist', label: 'Minimalist / Minimalis' },
  { key: 'pop-art', label: 'Pop Art / Seni Pop' },
  { key: 'watercolor', label: 'Watercolor / Cat Air' },
  { key: '3d-render', label: '3D Render / Render 3D' },
  { key: 'flat-design', label: 'Flat Design / Desain Datar' },
  { key: 'vintage', label: 'Vintage / Klasik' },
  { key: 'neon', label: 'Neon / Neon' },
  { key: 'gradient', label: 'Gradient / Gradien' },
];

export const colorOptions = [
  { key: 'vibrant', label: 'Vibrant / Cerah' },
  { key: 'pastel', label: 'Pastel / Pastel' },
  { key: 'monochrome', label: 'Monochrome / Monokrom' },
  { key: 'earth-tones', label: 'Earth Tones / Warna Bumi' },
  { key: 'neon', label: 'Neon / Neon' },
  { key: 'black-white', label: 'Black & White / Hitam Putih' },
  { key: 'brand-colors', label: 'Brand Colors / Warna Merek' },
  { key: 'complementary', label: 'Complementary / Komplementer' },
  { key: 'gradient', label: 'Gradient / Gradien' },
  { key: 'dark-mode', label: 'Dark Mode / Mode Gelap' },
];

export const textOverlayOptions = [
  { key: 'title-only', label: 'Title Only / Hanya Judul' },
  { key: 'title-subtitle', label: 'Title + Subtitle / Judul + Subjudul' },
  { key: 'quote', label: 'Quote / Kutipan' },
  { key: 'statistics', label: 'Statistics / Statistik' },
  { key: 'cta-button', label: 'CTA Button / Tombol CTA' },
  { key: 'no-text', label: 'No Text / Tanpa Teks' },
  { key: 'logo-only', label: 'Logo Only / Hanya Logo' },
];

// === RELAXING OPTIONS ===
export const environments = [
  { key: 'rain', label: 'Hujan' },
  { key: 'forest', label: 'Hutan' },
  { key: 'ocean', label: 'Pantai/Laut' },
  { key: 'fireplace', label: 'Perapian' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'thunderstorm', label: 'Badai' },
  { key: 'city-night', label: 'Kota Malam' },
  { key: 'mountain', label: 'Pegunungan' },
  { key: 'river', label: 'Sungai' },
  { key: 'library', label: 'Perpustakaan' },
  { key: 'spa', label: 'Spa' },
  { key: 'garden', label: 'Taman' },
  { key: 'campfire', label: 'Api Unggun' },
  { key: 'snow', label: 'Salju' },
  { key: 'desert', label: 'Gurun' },
];

export const primarySounds = [
  { key: 'rain-drops', label: 'Rain Drops / Tetes Hujan' },
  { key: 'waves', label: 'Waves / Ombak' },
  { key: 'fire-crackling', label: 'Fire Crackling / Api Berderak' },
  { key: 'birds', label: 'Birds / Burung' },
  { key: 'wind', label: 'Wind / Angin' },
  { key: 'thunder', label: 'Thunder / Guruh' },
  { key: 'water-stream', label: 'Water Stream / Aliran Air' },
  { key: 'white-noise', label: 'White Noise / Derau Putih' },
  { key: 'brown-noise', label: 'Brown Noise / Derau Coklat' },
  { key: 'piano', label: 'Piano / Piano' },
  { key: 'lofi', label: 'Lo-fi / Lo-fi' },
];

export const secondarySounds = [
  { key: 'birds', label: 'Birds / Burung' },
  { key: 'wind', label: 'Wind / Angin' },
  { key: 'distant-thunder', label: 'Distant Thunder / Guruh Jauh' },
  { key: 'leaves', label: 'Leaves / Daun' },
  { key: 'clock-ticking', label: 'Clock Ticking / Jam Berdetik' },
  { key: 'keyboard', label: 'Keyboard / Papan Ketik' },
  { key: 'coffee-shop', label: 'Coffee Shop Murmur / Suara Kafe' },
  { key: 'none', label: 'None / Tidak Ada' },
];

export const relaxingMoods = [
  { key: 'peaceful', label: 'Peaceful / Damai' },
  { key: 'focus', label: 'Focus / Fokus' },
  { key: 'sleep', label: 'Sleep / Tidur' },
  { key: 'meditation', label: 'Meditation / Meditasi' },
  { key: 'study', label: 'Study / Belajar' },
  { key: 'work', label: 'Work / Kerja' },
  { key: 'relaxation', label: 'Relaxation / Relaksasi' },
  { key: 'energy', label: 'Energy / Energi' },
];

export const visualStyles = [
  { key: 'static-image', label: 'Static Image / Gambar Diam' },
  { key: 'slow-motion', label: 'Slow Motion Video / Video Lambat' },
  { key: 'animated-loop', label: 'Animated Loop / Loop Animasi' },
  { key: 'abstract-particles', label: 'Abstract Particles / Partikel Abstrak' },
  { key: 'nature-footage', label: 'Nature Footage / Rekaman Alam' },
  { key: 'cozy-interior', label: 'Cozy Interior / Interior Nyaman' },
];

export const relaxingDurations = [
  { key: '30min', label: '30 menit' },
  { key: '1hour', label: '1 jam' },
  { key: '3hours', label: '3 jam' },
  { key: '10hours', label: '10 jam' },
];

// === CREATIVE SCAN OPTIONS ===
export const analysisTypes = [
  { key: 'hook', label: 'Hook Analysis / Analisis Hook' },
  { key: 'structure', label: 'Content Structure / Struktur Konten' },
  { key: 'engagement', label: 'Engagement Patterns / Pola Interaksi' },
  { key: 'full', label: 'Full Analysis / Analisis Penuh' },
  { key: 'viral', label: 'Viral Elements / Elemen Viral' },
  { key: 'storytelling', label: 'Storytelling Technique / Teknik Cerita' },
];

export const focusAreas = [
  { key: 'opening-hook', label: 'Opening Hook / Hook Awal' },
  { key: 'pacing', label: 'Pacing / Kecepatan' },
  { key: 'cta-placement', label: 'CTA Placement / Penempatan CTA' },
  { key: 'visual-style', label: 'Visual Style / Gaya Visual' },
  { key: 'audio-music', label: 'Audio/Music / Audio/Musik' },
  { key: 'transitions', label: 'Transitions / Transisi' },
  { key: 'text-overlays', label: 'Text Overlays / Hamparan Teks' },
  { key: 'thumbnail', label: 'Thumbnail / Sampul' },
  { key: 'retention-points', label: 'Retention Points / Titik Retensi' },
];

export const imagePurposes = [
  { key: 'thumbnail', label: 'YouTube Thumbnail / Sampul YouTube' },
  { key: 'cover', label: 'Cover Image / Gambar Sampul' },
  { key: 'post', label: 'Social Media Post / Postingan Sosmed' },
  { key: 'story', label: 'Social Story / Cerita Sosmed' },
  { key: 'banner', label: 'Website Banner / Spanduk Web' },
];
