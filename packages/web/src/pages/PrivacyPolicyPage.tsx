import { PublicPageLayout } from '../components/legal/PublicPageLayout';

export function PrivacyPolicyPage() {
  const effectiveDate = '4 Juli 2026';

  return (
    <PublicPageLayout title="Kebijakan Privasi">
      <p className="text-sm text-stone-600">Tanggal berlaku: {effectiveDate}</p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">1. Pendahuluan</h2>
        <p>
          AzaDrive (&quot;kami&quot;, &quot;milik kami&quot;, atau &quot;Layanan&quot;) adalah gerbang
          penyimpanan multi-Google Drive terpadu yang dioperasikan di{' '}
          <a href="https://azadrive.my.id" className="text-primary hover:underline">
            azadrive.my.id
          </a>
          . Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan
          melindungi informasi saat Anda menggunakan AzaDrive, termasuk data yang diperoleh dari Google
          APIs.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">2. Informasi yang Kami Kumpulkan</h2>
        <h3 className="font-medium text-stone-900">2.1 Informasi akun</h3>
        <p>
          Saat Anda mendaftar, kami menyimpan nama pengguna, nama tampilan, alamat email opsional, dan
          kata sandi yang di-hash untuk autentikasi.
        </p>
        <h3 className="font-medium text-stone-900">2.2 Data pengguna Google</h3>
        <p>
          Saat Anda menghubungkan akun Google Drive melalui OAuth, kami mengakses data pengguna Google
          sesuai izin cakupan yang Anda berikan, termasuk:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Alamat email akun Google dan informasi profil dasar Anda</li>
          <li>Metadata file Google Drive (nama, ukuran, tipe MIME, struktur folder, tanggal modifikasi)</li>
          <li>Konten file Google Drive saat Anda mengunggah, mengunduh, memindahkan, atau berbagi file melalui Layanan</li>
          <li>Informasi kuota penyimpanan Google Drive</li>
        </ul>
        <p>
          Kami menyimpan token refresh dan akses OAuth yang dienkripsi saat disimpan (AES-256-GCM) untuk
          memelihara drive yang terhubung. Kami tidak menyimpan kata sandi akun Google Anda.
        </p>
        <h3 className="font-medium text-stone-900">2.3 Data penggunaan</h3>
        <p>
          Kami dapat mencatat informasi teknis seperti alamat IP, cap waktu permintaan, dan log kesalahan
          untuk keamanan, pembatasan laju, dan keandalan layanan.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">3. Cara Kami Menggunakan Informasi Anda</h2>
        <p>Kami menggunakan informasi yang dikumpulkan hanya untuk:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Mengautentikasi Anda dan memelihara sesi Anda</li>
          <li>Menghubungkan dan menyinkronkan akun Google Drive Anda sesuai permintaan</li>
          <li>Menampilkan, mencari, mengunggah, mengunduh, memindahkan, dan berbagi file di seluruh drive yang terhubung</li>
          <li>Menerapkan izin ruang kerja, kuota, dan aturan otomatisasi yang Anda konfigurasi</li>
          <li>Menyediakan tautan berbagi dan akses API kompatibel S3 yang Anda aktifkan secara eksplisit</li>
          <li>Melindungi Layanan dari penyalahgunaan, penipuan, dan akses tidak sah</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">
          4. Kebijakan Data Pengguna Layanan Google API
        </h2>
        <p>
          Penggunaan dan transfer informasi yang diterima AzaDrive dari Google APIs mematuhi{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Kebijakan Data Pengguna Layanan Google API
          </a>
          , termasuk persyaratan Limited Use. Secara khusus:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Kami hanya menggunakan data pengguna Google untuk menyediakan dan meningkatkan fitur AzaDrive
            yang berhadapan dengan pengguna yang Anda gunakan secara eksplisit.
          </li>
          <li>Kami tidak menjual data pengguna Google.</li>
          <li>
            Kami tidak menggunakan data pengguna Google untuk periklanan, penilaian kelayakan kredit, atau
            tujuan pinjaman.
          </li>
          <li>
            Kami tidak mengizinkan manusia membaca data pengguna Google kecuali Anda memberikan persetujuan
            tegas untuk kasus tertentu, hal itu diperlukan untuk tujuan keamanan, atau diwajibkan oleh hukum.
          </li>
          <li>
            Kami tidak mentransfer data pengguna Google kepada pihak ketiga kecuali jika diperlukan untuk
            menyediakan Layanan (mis., infrastruktur hosting Cloudflare), untuk mematuhi hukum, atau sebagai
            bagian dari merger/akuisisi dengan pemberitahuan kepada pengguna.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">5. Penyimpanan dan Keamanan Data</h2>
        <p>
          Data disimpan di infrastruktur edge Cloudflare (database D1 dan KV store). Token OAuth
          dienkripsi sebelum disimpan. Kami menggunakan HTTPS untuk semua komunikasi, perlindungan
          CSRF pada permintaan API yang mengubah data, pembatasan laju, dan PKCE untuk alur OAuth.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">6. Penyimpanan dan Penghapusan Data</h2>
        <p>
          Kami menyimpan data akun dan metadata file yang disinkronkan selama akun Anda aktif. Saat
          Anda memutuskan koneksi akun Google Drive, kami menghapus token OAuth yang terkait. Anda
          dapat meminta penghapusan akun dengan menghubungi kami; kami akan menghapus data akun dan
          token drive yang terhubung dalam kerangka waktu yang wajar.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">7. Hak Anda</h2>
        <p>
          Anda dapat mencabut akses AzaDrive ke akun Google Anda kapan saja melalui{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Izin Akun Google
          </a>
          . Anda juga dapat memutuskan koneksi drive individual dari Pengaturan AzaDrive.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">8. Privasi Anak-anak</h2>
        <p>
          AzaDrive tidak ditujukan untuk anak di bawah 13 tahun. Kami tidak dengan sengaja mengumpulkan
          informasi pribadi dari anak-anak.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">9. Perubahan terhadap Kebijakan Ini</h2>
        <p>
          Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Kami akan memposting
          kebijakan yang direvisi pada halaman ini dengan tanggal berlaku yang diperbarui.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">10. Kontak</h2>
        <p>
          Untuk pertanyaan terkait privasi atau permintaan penghapusan data, hubungi kami di{' '}
          <a href="mailto:support@azadrive.my.id" className="text-primary hover:underline">
            support@azadrive.my.id
          </a>
          .
        </p>
      </section>
    </PublicPageLayout>
  );
}