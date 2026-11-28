-- ============================================================================
-- LANDACQ // WebGIS Pembebasan Lahan
-- Skema Database PostgreSQL / Supabase
-- Jalankan seluruh script ini pada menu SQL Editor di dashboard Supabase.
-- ============================================================================

-- 1. Tabel Master & Administrator
CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(20) PRIMARY KEY,
  nama_lengkap VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('master', 'admin')),
  jabatan VARCHAR(100) DEFAULT 'Koordinator Pengadaan Tanah',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Pengguna / User Operasional (Staf Ahli & User)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY,
  nama_lengkap VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('staf_ahli', 'user', 'surveyor', 'viewer')),
  unit_kerja VARCHAR(100) DEFAULT 'Tim Lapangan',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_admin_id VARCHAR(20) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_users_admin FOREIGN KEY (created_by_admin_id)
    REFERENCES admins(id) ON DELETE SET NULL
);

-- Migrasi aman untuk database Supabase yang sudah dibuat sebelumnya
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_role_check'
  ) THEN
    ALTER TABLE public.admins ADD CONSTRAINT admins_role_check CHECK (role IN ('master', 'admin'));
  END IF;

  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'user';
  ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('staf_ahli', 'user', 'surveyor', 'viewer'));
END $$;

-- 3. Tabel Bidang Tanah / Persil Akuisisi Lahan
CREATE TABLE IF NOT EXISTS parcels (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabel Konfigurasi Proyek & Koridor Trase (ROW)
CREATE TABLE IF NOT EXISTS project_settings (
  id INT PRIMARY KEY,
  nama_proyek VARCHAR(160) NOT NULL,
  kode_proyek VARCHAR(50) NOT NULL,
  wilayah VARCHAR(150),
  lebar_row_m INT NOT NULL DEFAULT 90,
  target_selesai DATE NULL,
  center_lat DOUBLE PRECISION DEFAULT -6.5458,
  center_lng DOUBLE PRECISION DEFAULT 107.7232,
  row_geojson TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabel Log Audit Aktivitas
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tanggal VARCHAR(20) NOT NULL,
  waktu VARCHAR(20) NOT NULL,
  aktor VARCHAR(120) NOT NULL,
  tipe_akun VARCHAR(20) NOT NULL,
  halaman VARCHAR(40) NOT NULL,
  aktivitas TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks Pencarian
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels (status_akuisisi);
CREATE INDEX IF NOT EXISTS idx_parcels_desa ON parcels (desa_kelurahan);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Konfigurasi Proyek Awal & Akun Awal (Master & Admin)
INSERT INTO project_settings (id, nama_proyek, kode_proyek, wilayah, lebar_row_m)
VALUES (1, 'Proyek Pengadaan Lahan', 'PRJ-001', 'Belum ditentukan', 90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO admins (id, nama_lengkap, username, email, password_hash, role, jabatan, is_active)
VALUES
  ('MST-001', 'Master Sistem WebGIS', 'master', 'master@landacq.id', 'master123', 'master', 'Super Administrator & Master Sistem', TRUE),
  ('ADM-001', 'Administrator Sistem', 'admin', 'admin@landacq.id', 'admin123', 'admin', 'Koordinator Pengadaan Tanah', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (Mode Prototipe WebGIS Frontend-Only)
-- Catatan: Untuk produksi, batasi policy ini dan gunakan Supabase Auth + Edge Functions / bcrypt.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prototype_all_admins" ON admins;
CREATE POLICY "prototype_all_admins" ON admins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "prototype_all_users" ON users;
CREATE POLICY "prototype_all_users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "prototype_all_parcels" ON parcels;
CREATE POLICY "prototype_all_parcels" ON parcels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "prototype_all_project_settings" ON project_settings;
CREATE POLICY "prototype_all_project_settings" ON project_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "prototype_all_audit_logs" ON audit_logs;
CREATE POLICY "prototype_all_audit_logs" ON audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Hak akses tabel untuk role anon & authenticated (wajib di Supabase PostgreSQL)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
