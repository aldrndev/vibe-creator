import { Mail } from 'lucide-react';
import { Button } from '@/components/ui';
import { useDocumentMetadata } from '@/hooks/use-document-metadata';
import { PublicPageLayout } from './PublicPageLayout';

const termsSections = [
  {
    title: 'Penggunaan layanan',
    body: 'Vibe Creator menyediakan workspace untuk membuat, mengedit, mengekspor, dan menyiarkan konten video. Anda bertanggung jawab atas source video, audio, gambar, prompt, stream key, dan konten lain yang digunakan di dalam layanan.',
  },
  {
    title: 'Akun dan keamanan',
    body: 'Jaga kredensial akun dan akses perangkat Anda. Aktivitas yang terjadi dari akun Anda dianggap sebagai penggunaan oleh pemilik akun, kecuali dapat dibuktikan sebaliknya.',
  },
  {
    title: 'Konten dan hak cipta',
    body: 'Pastikan Anda memiliki hak atau izin yang diperlukan untuk mengunggah, memproses, mengekspor, atau menyiarkan konten. Vibe Creator tidak mengklaim kepemilikan atas konten yang Anda buat.',
  },
  {
    title: 'Export, download, dan lifecycle',
    body: 'Draft, source asset, hasil export, download, dan session dapat memiliki masa berlaku sesuai paket atau kebijakan lifecycle produk. Konten yang sudah expired dapat dibersihkan otomatis.',
  },
  {
    title: 'Perubahan layanan',
    body: 'Karena produk masih dalam pengembangan sebelum launch penuh, fitur, harga, kuota, dan workflow dapat disesuaikan untuk meningkatkan stabilitas dan keamanan.',
  },
];

const privacySections = [
  {
    title: 'Data akun',
    body: 'Kami memproses data seperti nama, email, role, subscription, preferensi, dan riwayat penggunaan agar Anda dapat login, melanjutkan project, serta mengakses fitur sesuai paket.',
  },
  {
    title: 'Data konten',
    body: 'Video, audio, image, prompt, project document, dan hasil export diproses untuk menjalankan tool seperti AI Director, Video Studio, Loop Creator, Reaction Recorder, dan Live Streaming.',
  },
  {
    title: 'Session dan keamanan',
    body: 'Session login, token akses, dan verifikasi keamanan dipakai untuk menjaga akun tetap aman, mencegah penyalahgunaan, dan memastikan fitur hanya diakses oleh pemilik akun yang sah.',
  },
  {
    title: 'Cloudflare Turnstile',
    body: 'Login dan register memakai Cloudflare Turnstile untuk membantu mencegah bot, penyalahgunaan form, dan credential stuffing. Token verifikasi dikirim ke backend untuk divalidasi dan tidak dipakai sebagai identitas konten Anda.',
  },
  {
    title: 'Penyimpanan dan penghapusan',
    body: 'Beberapa file bersifat sementara dan dapat dihapus otomatis setelah masa berlaku. Data billing, audit, atau metadata operasional dapat disimpan lebih lama bila diperlukan untuk keamanan, support, atau kepatuhan.',
  },
];

function LegalSectionList({
  sections,
}: Readonly<{ sections: ReadonlyArray<{ title: string; body: string }> }>) {
  return (
    <div className="grid gap-4">
      {sections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border/70 bg-card/70 p-5">
          <h2 className="text-lg font-black">{section.title}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
            {section.body}
          </p>
        </section>
      ))}
    </div>
  );
}

export function TermsPage() {
  useDocumentMetadata({
    title: 'Syarat & Ketentuan - Vibe Creator',
    description:
      'Ringkasan pre-launch tentang cara memakai workspace Vibe Creator secara aman dan bertanggung jawab.',
  });

  return (
    <PublicPageLayout
      eyebrow="Terms"
      title="Ketentuan penggunaan Vibe Creator."
      description="Ringkasan pre-launch tentang cara memakai workspace Vibe Creator secara aman dan bertanggung jawab."
    >
      <LegalSectionList sections={termsSections} />
    </PublicPageLayout>
  );
}

export function PrivacyPage() {
  useDocumentMetadata({
    title: 'Kebijakan Privasi - Vibe Creator',
    description:
      'Penjelasan ringkas tentang data yang diproses untuk menjalankan akun, project, export, dan proteksi keamanan Vibe Creator.',
  });

  return (
    <PublicPageLayout
      eyebrow="Privacy"
      title="Privasi dan pemrosesan data."
      description="Penjelasan ringkas tentang data yang diproses untuk menjalankan akun, project, export, dan proteksi keamanan Vibe Creator."
    >
      <LegalSectionList sections={privacySections} />
    </PublicPageLayout>
  );
}

export function ContactPage() {
  useDocumentMetadata({
    title: 'Hubungi Kami - Vibe Creator',
    description:
      'Untuk pertanyaan pre-launch, support akun, atau kerja sama, gunakan kanal kontak berikut.',
  });

  return (
    <PublicPageLayout
      eyebrow="Contact"
      title="Hubungi tim Vibe Creator."
      description="Untuk pertanyaan pre-launch, support akun, atau kerja sama, gunakan kanal kontak berikut."
    >
      <div className="rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Support pre-launch</h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-muted-foreground">
              Kirim detail masalah, email akun, dan screenshot bila ada. Tim akan memakai informasi
              itu untuk membantu investigasi.
            </p>
          </div>
          <Button asChild className="h-11 rounded-xl font-bold">
            <a href="mailto:support@vibecreator.id">
              <Mail size={16} />
              support@vibecreator.id
            </a>
          </Button>
        </div>
      </div>
    </PublicPageLayout>
  );
}
