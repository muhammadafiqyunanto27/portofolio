# Portofolio — Muhammad Afiq Yunanto

Website portofolio pribadi untuk **Muhammad Afiq Yunanto**, Full-Stack Developer
dan Software Developer dengan latar belakang Rekayasa Perangkat Lunak, sekaligus
mahasiswa D4 Analisis Keuangan di Politeknik Negeri Semarang.

Situs statis murni: **HTML + CSS + JavaScript**, tanpa framework, tanpa build step,
tanpa dependensi. Bisa langsung di-hosting di GitHub Pages, Vercel, Netlify, atau
di-Mo lewat file biasa.

Halaman tersedia dalam dua bahasa (Indonesia dan Inggris) dan bisa berganti lewat
tombol **ID / EN** di header.

---

## Mulai Cepat

Tidak perlu `npm install` — project ini sengaja dibuat tanpa dependensi.

```bash
# Cara paling cepat: buka index.html langsung di browser
start index.html          # Windows
open index.html           # macOS
xdg-open index.html       # Linux
```

Kalau mau pratinjau lewat HTTP (disarankan, agar tidak ada masalah `file://`):

```bash
npm run dev               # http://localhost:5173
npm run dev -- 8080       # ganti port
```

Lalu jalankan pemeriksaan kualitas:

```bash
npm run check
```

---

## Isi Repository

```
.
├── index.html            # Beranda: hero, what I do, tech stack, featured project, philosophy
├── about.html            # Tentang: bio, skill bars, pengalaman, pendidikan, strengths, fokus
├── portofolio.html       # MafynGate sebagai project unggulan + filter kategori project lain
├── contact.html          # Kontak: form tervalidasi, kanal komunikasi, FAQ
│
├── assets/
│   ├── favicon.png       # Ikon tab, dibuat dari logo navbar
│   ├── logo-dark.png     # Logo untuk latar gelap
│   ├── logo-light.png    # Logo untuk latar terang
│   ├── portrait.png      # Foto profil
│   └── port-afiq.png     # Sumber foto asli (tidak dipakai langsung)
│
├── styles/
│   ├── tokens.css        # Design token: warna, tipografi, spacing, motion
│   ├── base.css          # Reset, tipografi, utilitas, keyframes, reveal
│   ├── components.css    # Header, tombol, kartu, form, footer
│   └── pages.css         # Layout khusus tiap halaman
│
├── js/
│   └── main.js           # Semua perilaku bersama (IIFE, tanpa dependensi) + lapisan i18n
│
├── scripts/
│   ├── serve.mjs         # Server statis tanpa dependensi
│   └── check.mjs         # Validator tautan, aset, dan markup
│
├── site.webmanifest      # Metadata PWA
├── sitemap.xml           # Peta situs untuk mesin pencari
├── robots.txt
└── package.json
```

---

## Fitur

**Dua bahasa (ID / EN)**
Satu file per halaman, tanpa folder `/en/`. Bahasa Indonesia ditulis langsung di
markup, sedangkan versi Inggris disimpan di atribut `data-en` (teks),
`data-en-aria` (atribut aksesibel), `data-en-ph` (placeholder), serta
`data-en-title` dan `data-en-desc` pada `<html>`. Pilihan bahasa disimpan di
`localStorage` dengan key `may-portfolio-lang`, dan default-nya Indonesia.
Teks asli bertanda `<strong>`/`<em>` dicadangkan sekali sebelum pergantian bahasa,
sehingga kembali ke ID tidak merusak format.

**Tema terang / gelap**
Pilihan disimpan di `localStorage` dan diterapkan lewat skrip inline di `<head>`,
sehingga tidak ada kedipan warna salah saat halaman dimuat. Kalau pengunjung belum
pernah memilih, situs mengikuti preferensi sistem operasi.

**Navigasi responsif**
Di layar lebar berupa navbar; di bawah 800 px berubah menjadi menu geser.
Tautan aktif ditandai otomatis dari nama file halaman.

**Animasi saat scroll**
Elemen beranotasi `.reveal` muncul perlahan saat masuk viewport.
Jika `prefers-reduced-motion: aktif`, semua animasi dinonaktifkan.

**Filter project**
Menyaring project tanpa reload. Jumlah project per kategori dihitung otomatis dari
isi halaman, jadi tidak bisa meleset. Mendukung query string, misal
`portofolio.html?filter=laravel`.

**Form kontak tanpa backend**
Divalidasi di browser, lalu pesannya disusun rapi dan/langsung dibuka di WhatsApp.
Ganti `data-channel="whatsapp"` menjadi `data-channel="mailto"` untuk memakai
aplikasi email. Tidak ada data yang dikirim ke server mana pun.

**Aksesibilitas**
Skip link, landmark semantik, `aria-current` pada halaman aktif, fokus yang terlihat,
`aria-label` pada tombol ikon, dan penghormatan terhadap `prefers-reduced-motion`.

**SEO dan metadata**
Judul dan deskripsi unik per halaman, Open Graph, Twitter Card, canonical URL,
JSON-LD (`Person` dan `BreadcrumbList`), sitemap, dan robots.

---

## Menambah Project Baru

1. Salin satu blok `<article class="card card--hover project">` di `portofolio.html`.
2. Isi `data-category` dengan kategori yang dipisah spasi, contoh:
   `data-category="fullstack typescript laravel"`.
3. Jumlah per kategori dihitung ulang otomatis oleh JavaScript — tidak perlu
   menyunting angka pada tombol filter.

Kategori yang tersedia: `frontend`, `backend`, `fullstack`, `laravel`, `testing`.
Untuk menambah kategori baru, cukup tambahkan satu tombol `<button data-filter="...">`.

## Menambah Fitur MafynGate

Daftar fitur platform personal ada di `portofolio.html`, di dalam blok
`cluster` berlabel **Fitur yang dikembangkan**. Tambah `<span class="tag">` di sana
untuk memperbarui daftar — tidak ada angka atau hitungan yang perlu disunting.

---

## Kustomisasi

### Warna

Semua warna terkumpul di `styles/tokens.css`. Ubah nilai pada blok `:root` untuk
merek dan blok `[data-theme="light"]` untuk tema terang:

```css
:root { --accent: #f5f5f5; }                 /* aksen dark mode — putih */
[data-theme="light"] { --accent: #1d1d1d; }  /* aksen light mode — hitam */
```

Palet mengikuti bahasa desain Apple dan sepenuhnya monokrom: kanvas hitam pekat
dengan panel `#1d1d1d` dan teks `#f5f5f5` di tema gelap, serta latar `#f5f5f5`
dan teks `#1d1d1d` di tema terang. Tidak ada hue warna sama sekali — penekanan
hanya lewat kontras putih/hitam. Tipografi memakai font sistem (`-apple-system`,
SF Pro di perangkat Apple, Segoe UI di Windows), tanpa webfont eksternal.

### Logo

Ganti `assets/logo-dark.png` dan `assets/logo-light.png`. Kedua berkas harus
memiliki rasio ukuran yang sama, karena logo ditukar otomatis saat tema berubah.

### Data kontak

Terdiri di tiga tempat yang harus dijaga sinkronnya:

- `js/main.js` — `data-phone` pada form di `contact.html`
- `contact.html` — kartu kontak dan tombol
- seluruh halaman — blok `<footer>`

Jalankan `npm run check` setelah mengubahnya; validator akan menandai tautan rusak
jika ada yang tidak cocok.

---

## Menjalankan Pemeriksaan

`npm run check` akan memverifikasi:

- setiap aset dan tautan lokal benar-benar ada di disk
- setiap halaman punya `<title>`, meta description, `<h1>`, `<main>`, `<nav>`, canonical
- `<title>` dan deskripsi unik antar halaman serta panjangnya wajar
- tag HTML seimbang (tidak ada tag yang lupa ditutup)
- form kontak punya `data-phone`, `data-channel`, dan keempat field
- setiap filter portofolio cocok dengan minimal satu project
- tidak ada karakter asing yang menyelinap ke dalam teks
- setiap punya tombol ID/EN, `data-en-title`, `data-en-desc`, dan tidak ada
  terjemahan `data-en` yang kosong

---

## Deployment

**Vercel** — import repository, biarkan semua build command kosong, output directory
`./`. Sudah ada `homepage` di `package.json`.

**GitHub Pages** — Settings → Pages → deploy from branch, folder `/ (root)`.

**Nginx / Apache** — cukup arahkan document root ke folder repository. Tidak ada
proses build sama sekali.

> Kalau memindahkan situs ke domain lain, perbarui `rel="canonical"`, `og:url`,
> JSON-LD, `sitemap.xml`, dan `robots.txt`.

---

## Lisensi

MIT — silakan dipakai sebagai referensi belajar.
