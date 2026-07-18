import { PublicPageLayout } from '../components/legal/PublicPageLayout';

export function TermsOfServicePage() {
  const effectiveDate = '4 Juli 2026';

  return (
    <PublicPageLayout title="Ketentuan Layanan">
      <p className="text-sm text-stone-600">Tanggal berlaku: {effectiveDate}</p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">1. Penerimaan Ketentuan</h2>
        <p>
          Dengan mengakses atau menggunakan AzaDrive di{' '}
          <a href="https://azadrive.my.id" className="text-primary hover:underline">
            azadrive.my.id
          </a>
          , Anda menyetujui Ketentuan Layanan ini (&quot;Ketentuan&quot;). Jika Anda tidak setuju,
          jangan gunakan Layanan.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">2. Deskripsi Layanan</h2>
        <p>
          AzaDrive adalah aplikasi yang di-host di cloud yang memungkinkan Anda menghubungkan
          beberapa akun Google Drive, mengelola file melalui antarmuka terpadu, membuat ruang kerja
          tim, membuat tautan berbagi, mengonfigurasi aturan otomatisasi, dan secara opsional
          mengakses file melalui API kompatibel S3.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">3. Pendaftaran Akun</h2>
        <p>
          Anda harus memberikan informasi pendaftaran yang akurat dan menjaga keamanan kredensial
          Anda. Anda bertanggung jawab atas semua aktivitas di bawah akun Anda. Pendaftaran mungkin
          memerlukan kode undangan sesuai kebijakan administrator.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">4. Koneksi Google Drive</h2>
        <p>
          Menghubungkan akun Google Drive mengharuskan Anda mengotorisasi AzaDrive melalui Google
          OAuth. Anda memberikan izin kepada AzaDrive untuk mengakses data Google Drive Anda hanya
          sebatas cakupan yang Anda setujui. Anda dapat mencabut akses ini kapan saja melalui
          pengaturan Akun Google atau dengan memutuskan koneksi drive di Pengaturan AzaDrive.
        </p>
        <p>
          Anda menyatakan bahwa Anda memiliki hak untuk menghubungkan setiap akun Google Drive yang
          Anda tautkan dan bahwa penggunaan Anda mematuhi{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Ketentuan Layanan Google
          </a>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">5. Penggunaan yang Dapat Diterima</h2>
        <p>Anda setuju untuk tidak:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Menggunakan Layanan untuk tujuan melanggar hukum atau untuk menyimpan/mendistribusikan konten ilegal</li>
          <li>Berusaha mendapatkan akses tidak sah ke akun atau data pengguna lain</li>
          <li>Mengganggu atau merusak Layanan atau infrastrukturnya</li>
          <li>Melewati pembatasan laju, autentikasi, atau kontrol akses</li>
          <li>Menggunakan Layanan untuk mengirim spam atau perangkat lunak berbahaya</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">6. Konten Anda</h2>
        <p>
          Anda mempertahankan kepemilikan file yang disimpan di akun Google Drive yang terhubung.
          AzaDrive menyimpan metadata file dan token OAuth yang dienkripsi untuk menyediakan Layanan
          tetapi tidak mengklaim kepemilikan atas file Anda. Anda bertanggung jawab sepenuhnya atas
          konten yang Anda kelola melalui Layanan.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">7. Ketersediaan Layanan</h2>
        <p>
          AzaDrive disediakan atas dasar &quot;apa adanya&quot; dan &quot;sebagaimana tersedia&quot;.
          Kami tidak menjamin operasi yang tanpa gangguan atau bebas kesalahan. Pemeliharaan terjadwal,
          pemadaman pihak ketiga (termasuk Google APIs atau Cloudflare), atau keadaan kahar dapat
          memengaruhi ketersediaan.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">8. Batasan Tanggung Jawab</h2>
        <p>
          Sejauh diizinkan oleh hukum, AzaDrive dan operatornya tidak bertanggung jawab atas kerusakan
          tidak langsung, insidental, khusus, konsekuensial, atau hukuman, atau kehilangan data, laba,
          atau goodwill, yang timbul dari penggunaan Layanan oleh Anda.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">9. Penghentian</h2>
        <p>
          Kami dapat menangguhkan atau menghentikan akses Anda jika Anda melanggar Ketentuan ini atau
          jika diperlukan karena alasan keamanan atau hukum. Anda dapat berhenti menggunakan Layanan
          kapan saja dan meminta penghapusan akun dengan menghubungi dukungan.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">10. Perubahan Ketentuan</h2>
        <p>
          Kami dapat mengubah Ketentuan ini kapan saja. Penggunaan Layanan yang berlanjut setelah
          perubahan diposting merupakan persetujuan terhadap Ketentuan yang direvisi.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">11. Kontak</h2>
        <p>
          Pertanyaan tentang Ketentuan ini:{' '}
          <a href="mailto:support@azadrive.my.id" className="text-primary hover:underline">
            support@azadrive.my.id
          </a>
          .
        </p>
      </section>
    </PublicPageLayout>
  );
}