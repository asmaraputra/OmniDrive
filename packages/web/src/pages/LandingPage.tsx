import { Link } from 'react-router-dom';
import {
  Cloud,
  FolderSync,
  Link2,
  Shield,
  Users,
  ArrowRight,
  Github,
} from 'lucide-react';

const features = [
  {
    icon: Cloud,
    title: 'Gateway Multi-Drive',
    description:
      'Hubungkan beberapa akun Google Drive dan jelajahi semua file dari satu dashboard. Tak perlu lagi berpindah akun.',
  },
  {
    icon: Users,
    title: 'Workspace Tim',
    description:
      'Kelola file dalam workspace dengan kontrol akses berbasis peran — viewer, editor, manager, owner.',
  },
  {
    icon: Link2,
    title: 'Tautan Terbagi',
    description:
      'Bagikan file dengan proteksi password, tanggal kedaluwarsa, dan batasan unduhan. Terkunci setelah terlalu banyak percobaan.',
  },
  {
    icon: FolderSync,
    title: 'Sinkronisasi Latar Belakang',
    description:
      'Sinkronisasi inkremental otomatis menjaga indeks file tetap mutakhir di semua drive terhubung, setiap 30 menit.',
  },
  {
    icon: Shield,
    title: 'Keamanan Utama',
    description:
      'Token OAuth terenkripsi saat disimpan (AES-256-GCM), proteksi CSRF di setiap mutasi, alur autentikasi PKCE.',
  },
];

const stats = [
  { label: '$0 biaya', sub: 'free tier selamanya' },
  { label: 'Multi-drive', sub: 'satukan akun' },
  { label: 'S3-compatible', sub: 'API standar' },
];

// Static numbers for the mockup — marketing copy, not real data.
// ponytail: inline SVG ring (~5 lines) over Recharts — landing LCP stays light.
const MOCK_USED_PCT = 68;

export function LandingPage() {
  const ringCircumference = 2 * Math.PI * 36;
  const ringOffset = ringCircumference * (1 - MOCK_USED_PCT / 100);

  return (
    <div className="min-h-[100dvh] bg-surface">
      <header className="border-b border-stone-200 bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png?v=2" alt="Logo AzaDrive" className="h-8 w-8 object-contain" />
            <span className="text-lg font-semibold text-stone-900">AzaDrive</span>
          </div>
          <Link
            to="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Masuk
          </Link>
        </div>
      </header>

      <main>
        {/* Hero — asymmetric 5/7 split. Left: text + CTA. Right: CSS dashboard mockup. */}
        <section className="border-b border-stone-200 bg-background">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:py-24">
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Gratis · open source
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                Gateway penyimpanan multi-Google Drive terpadu.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-stone-600">
                Hubungkan beberapa akun Google Drive dalam satu dashboard. Bagikan
                tautan secara aman, kelola workspace tim, dan akses penyimpanan
                lewat API kompatibel S3 — semuanya self-hosted di Cloudflare.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary/90"
                >
                  Mulai
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="https://github.com/asmaraputra/OmniDrive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-card px-6 py-3 text-base font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <Github size={16} />
                  Lihat di GitHub
                </a>
              </div>
            </div>

            {/* CSS dashboard mockup — echoes the real DashboardPage bento. */}
            <div className="lg:col-span-7">
              <div
                className="rounded-2xl border border-stone-200 bg-card p-4 shadow-sm sm:p-5"
                aria-hidden="true"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-700">Selamat siang, Asmara</div>
                    <div className="text-xs text-stone-400">3 drive · 142 GB kosong</div>
                  </div>
                  <div className="rounded-lg border border-stone-300 bg-background px-2.5 py-1 text-xs text-stone-500">
                    Segarkan
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Storage hero cell */}
                  <div className="row-span-2 rounded-xl border border-stone-200 bg-gradient-to-br from-primary/5 via-card to-card p-4">
                    <div className="text-xs text-stone-500">Total penyimpanan</div>
                    <div className="relative mx-auto mt-3 flex h-24 w-24 items-center justify-center">
                      <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full">
                        <circle cx="40" cy="40" r="36" fill="none" stroke="#e7e5e4" strokeWidth="6" />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                          transform="rotate(-90 40 40)"
                        />
                      </svg>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-stone-800">{MOCK_USED_PCT}%</div>
                        <div className="text-[10px] text-stone-400">142/200GB</div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-center gap-2 text-[11px]">
                      <span className="font-medium text-primary">142 GB kosong</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-stone-500">58 GB terpakai</span>
                    </div>
                  </div>

                  {/* Quick access list cell */}
                  <div className="rounded-xl border border-stone-200 bg-surface p-3">
                    <div className="mb-2 text-xs font-medium text-stone-500">Akses cepat</div>
                    <ul className="space-y-1.5">
                      {[
                        { label: 'Drive Saya', hint: 'Jelajahi semua' },
                        { label: 'Berbintang', hint: '12 ditandai' },
                        { label: 'Terbagi', hint: '5 tautan' },
                      ].map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center gap-2 rounded-lg border border-stone-200 bg-card px-2.5 py-1.5"
                        >
                          <div className="h-5 w-5 rounded bg-primary/10" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-medium text-stone-700">{row.label}</div>
                            <div className="text-[9px] text-stone-400">{row.hint}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recent files cell */}
                  <div className="rounded-xl border border-stone-200 bg-card p-3">
                    <div className="mb-2 text-xs font-medium text-stone-500">Terbaru</div>
                    <ul className="space-y-1.5">
                      {[
                        { name: 'report.pdf', time: '2j lalu', color: '#3b82f6' },
                        { name: 'photo.jpg', time: '5j lalu', color: '#ef4444' },
                        { name: 'Q3 plans/', time: '1hr lalu', color: '#f59e0b' },
                      ].map((row) => (
                        <li
                          key={row.name}
                          className="flex items-center gap-2 rounded-md px-2 py-1"
                        >
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="flex-1 truncate text-[11px] text-stone-600">{row.name}</span>
                          <span className="text-[9px] text-stone-400">{row.time}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-b border-stone-200 bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-5 text-center sm:px-6 sm:gap-x-12">
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-x-8 sm:gap-x-12">
                {i > 0 && <span className="hidden h-4 w-px bg-stone-300 sm:block" aria-hidden="true" />}
                <div>
                  <div className="text-base font-semibold text-stone-900">{s.label}</div>
                  <div className="text-xs text-stone-500">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features — alternating left/right rows */}
        <section className="bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Semua yang Anda butuhkan untuk menyatukan drive Anda.
            </h2>
            <div className="space-y-10 sm:space-y-14">
              {features.map(({ icon: Icon, title, description }, i) => {
                const isEven = i % 2 === 0;
                return (
                  <div
                    key={title}
                    className="grid items-center gap-5 sm:grid-cols-12 sm:gap-8"
                  >
                    <div
                      className={`sm:col-span-4 ${isEven ? 'sm:order-1' : 'sm:col-start-9 sm:order-2'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" aria-hidden />
                        </div>
                        <h3 className="text-lg font-semibold text-stone-900 sm:hidden">{title}</h3>
                      </div>
                    </div>
                    <div
                      className={`sm:col-span-7 ${isEven ? 'sm:col-start-6 sm:order-2' : 'sm:order-1'}`}
                    >
                      <h3 className="hidden text-lg font-semibold text-stone-900 sm:block">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600 sm:text-base">
                        {description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* OAuth disclaimer */}
        <section className="border-t border-stone-200 bg-card">
          <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
            <p className="text-sm text-stone-600">
              AzaDrive menggunakan Google OAuth untuk menghubungkan akun Google Drive
              Anda. Dengan masuk dan menghubungkan drive, Anda menyetujui{' '}
              <Link to="/terms" className="text-blue-700 underline hover:text-blue-800">
                Ketentuan Layanan
              </Link>{' '}
              dan{' '}
              <Link to="/privacy" className="text-blue-700 underline hover:text-blue-800">
                Kebijakan Privasi
              </Link>
              kami.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Siap menyatukan drive Anda?
            </h2>
            <p className="mt-3 text-base text-stone-600">
              Self-host di free tier Cloudflare. Hubungkan Drive pertama Anda dalam
              waktu kurang dari semenit.
            </p>
            <Link
              to="/login"
              className="mt-7 inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary/90"
            >
              Mulai
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-stone-500 sm:px-6">
          <p>© {new Date().getFullYear()} AzaDrive</p>
          <nav className="flex flex-wrap gap-4" aria-label="Footer">
            <Link to="/privacy" className="hover:text-primary">Kebijakan Privasi</Link>
            <Link to="/terms" className="hover:text-primary">Ketentuan Layanan</Link>
            <a href="mailto:support@azadrive.my.id" className="hover:text-primary">Kontak</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
