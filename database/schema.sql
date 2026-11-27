-- ============================================================================
-- LANDACQ // WebGIS Pembebasan Lahan
-- Skema Database Manual (MySQL 8+ / MariaDB / PostgreSQL compatible notes)
-- Tanpa data dummy awal — seluruh data diinput manual atau melalui import.
-- ============================================================================

-- 1. Tabel Administrator (Tabel terpisah khusus pengelola / koordinator sistem)
CREATE TABLE admins (
  id VARCHAR(20) PRIMARY KEY,
  nama_lengkap VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  jabatan VARCHAR(100) DEFAULT 'Koordinator Pengadaan Tanah',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Pengguna / User Operasional (Surveyor Lapangan & Viewer Eksekutif)
CREATE TABLE users (
  id VARCHAR(20) PRIMARY KEY,
  nama_lengkap VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('surveyor', 'viewer')),
  unit_kerja VARCHAR(100) DEFAULT 'Tim Lapangan',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_admin_id VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_admin FOREIGN KEY (created_by_admin_id)
    REFERENCES admins(id) ON DELETE SET NULL
);

-- 3. Tabel Bidang Tanah / Persil Akuisisi Lahan
CREATE TABLE parcels (
  id_bidang VARCHAR(32) PRIMARY KEY,
  nama_pemilik VARCHAR(150) NOT NULL,
  desa_kelurahan VARCHAR(120) NOT NULL,
  luas_m2 DECIMAL(14, 2) NOT NULL CHECK (luas_m2 > 0),
  nilai_ugr DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (nilai_ugr >= 0),
  status_akuisisi VARCHAR(40) NOT NULL DEFAULT 'Belum Diproses'
    CHECK (status_akuisisi IN (
      'Bebas/Lunas',
      'Proses Pembayaran UGR',
      'Negosiasi',
      'Sengketa/Kendala',
      'Belum Diproses'
    )),
  persentase_progres SMALLINT NOT NULL DEFAULT 0 CHECK (persentase_progres BETWEEN 0 AND 100),
  catatan_lapangan TEXT,
  geometry_geojson TEXT NOT NULL,
  updated_by_account_id VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Konfigurasi Proyek & Koridor Trase (ROW)
CREATE TABLE project_settings (
  id INT PRIMARY KEY,
  nama_proyek VARCHAR(160) NOT NULL,
  kode_proyek VARCHAR(50) NOT NULL,
  wilayah VARCHAR(150),
  lebar_row_m INT NOT NULL DEFAULT 90,
  target_selesai DATE NULL,
  row_geojson TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Log Audit Aktivitas
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tanggal VARCHAR(20) NOT NULL,
  waktu VARCHAR(20) NOT NULL,
  aktor VARCHAR(120) NOT NULL,
  tipe_akun VARCHAR(20) NOT NULL,
  halaman VARCHAR(40) NOT NULL,
  aktivitas TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indeks Pencarian
CREATE INDEX idx_parcels_status ON parcels (status_akuisisi);
CREATE INDEX idx_parcels_desa ON parcels (desa_kelurahan);
CREATE INDEX idx_users_role ON users (role);

-- Akun Admin Dummy Sementara
INSERT INTO admins (id, nama_lengkap, username, email, password_hash, jabatan, is_active)
VALUES ('ADM-001', 'Administrator Sistem', 'admin', 'admin@landacq.id', 'admin123', 'Koordinator Pengadaan Tanah', TRUE);
