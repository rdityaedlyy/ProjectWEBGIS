-- ============================================================================
-- LANDACQ // WebGIS Pembebasan Lahan
-- Skema Database PostgreSQL / Supabase
-- Jalankan seluruh script ini pada menu SQL Editor di dashboard Supabase.
-- ============================================================================

-- 1. Tabel Kategori Admin (Hierarki: Master > Admin > Staf Ahli)
CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(20) PRIMARY KEY,
  nama_lengkap VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staf_ahli' CHECK (role IN ('master', 'admin', 'staf_ahli')),
  jabatan VARCHAR(100) DEFAULT 'Koordinator Pengadaan Tanah',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Pengguna Umum (User: hanya lihat data)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY,
  nama_lengkap VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'viewer')),
  unit_kerja VARCHAR(100) DEFAULT 'Pengguna Umum',
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

  ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_role_check;
  ALTER TABLE public.admins ADD CONSTRAINT admins_role_check CHECK (role IN ('master', 'admin', 'staf_ahli'));

  -- Pindahkan akun Staf Ahli (jika sebelumnya ada di tabel users) ke kategori admins (di bawah Admin)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    DROP INDEX IF EXISTS public.uq_single_staf_ahli_role;

    INSERT INTO public.admins (id, nama_lengkap, username, email, password_hash, role, jabatan, is_active, created_at, updated_at)
    SELECT
      id,
      nama_lengkap,
      username,
      email,
      password_hash,
      'staf_ahli',
      COALESCE(NULLIF(unit_kerja, ''), 'Staf Ahli Teknis & Data'),
      is_active,
      created_at,
      updated_at
    FROM public.users
    WHERE role IN ('staf_ahli', 'surveyor')
    ON CONFLICT DO NOTHING;

    DELETE FROM public.users WHERE role IN ('staf_ahli', 'surveyor');
    UPDATE public.users SET role = 'user' WHERE role = 'viewer';

    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'user';
    ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'viewer'));
  END IF;

  -- Tambahkan kolom kontrol akses download per bidang pada tabel parcels
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parcels') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'parcels' AND column_name = 'download_policy'
    ) THEN
      ALTER TABLE public.parcels ADD COLUMN download_policy VARCHAR(24) NOT NULL DEFAULT 'approval';
    END IF;
    ALTER TABLE public.parcels DROP CONSTRAINT IF EXISTS parcels_download_policy_check;
    ALTER TABLE public.parcels ADD CONSTRAINT parcels_download_policy_check CHECK (download_policy IN ('open', 'approval'));
  END IF;
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
  download_policy VARCHAR(24) NOT NULL DEFAULT 'approval' CHECK (download_policy IN ('open', 'approval')),
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
  center_lat DOUBLE PRECISION DEFAULT -0.44019,
  center_lng DOUBLE PRECISION DEFAULT 116.98139,
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

-- 6. Tabel Permintaan Izin Download Data Persil (persetujuan oleh Staf Ahli / Admin / Master)
CREATE TABLE IF NOT EXISTS download_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id VARCHAR(20) NOT NULL,
  requester_name VARCHAR(120) NOT NULL,
  requester_username VARCHAR(80) NOT NULL,
  requester_role VARCHAR(20) NOT NULL DEFAULT 'user',
  parcel_id VARCHAR(32) NOT NULL,
  parcel_owner VARCHAR(150) NULL,
  requested_formats VARCHAR(80) NOT NULL DEFAULT 'xlsx,geojson,shp,csv',
  request_note TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_id VARCHAR(20) NULL,
  reviewed_by_name VARCHAR(120) NULL,
  reviewed_by_role VARCHAR(20) NULL,
  review_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ NULL
);

-- Indeks Pencarian & Pembatas 1 Akun (1 Master, 1 Admin, 1 Staf Ahli pada tabel admins)
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels (status_akuisisi);
CREATE INDEX IF NOT EXISTS idx_parcels_desa ON parcels (desa_kelurahan);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests (status);
CREATE INDEX IF NOT EXISTS idx_download_requests_requester ON download_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_download_requests_parcel ON download_requests (parcel_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_single_master_role
  ON public.admins (role) WHERE role = 'master';
CREATE UNIQUE INDEX IF NOT EXISTS uq_single_admin_role
  ON public.admins (role) WHERE role = 'admin';
CREATE UNIQUE INDEX IF NOT EXISTS uq_single_staf_ahli_role
  ON public.admins (role) WHERE role = 'staf_ahli';

-- Konfigurasi Proyek Awal & Akun Dummy (Kategori Admin: Master > Admin > Staf Ahli, serta 1 User Publik)
INSERT INTO project_settings (id, nama_proyek, kode_proyek, wilayah, lebar_row_m, center_lat, center_lng)
VALUES (1, 'Proyek Pengadaan Lahan', 'PRJ-001', 'Kab. Kutai Kartanegara, Kalimantan Timur', 90, -0.44019, 116.98139)
ON CONFLICT (id) DO NOTHING;

UPDATE public.project_settings
SET wilayah = 'Kab. Kutai Kartanegara, Kalimantan Timur',
    center_lat = -0.44019,
    center_lng = 116.98139
WHERE id = 1
  AND (wilayah IS NULL OR wilayah = 'Belum ditentukan' OR ABS(center_lat - (-6.5458)) < 0.002);

INSERT INTO admins (id, nama_lengkap, username, email, password_hash, role, jabatan, is_active)
VALUES
  ('MST-001', 'Master Sistem WebGIS', 'master', 'master@landacq.id', 'master123', 'master', 'Master & Super Administrator', TRUE),
  ('ADM-001', 'Administrator Sistem', 'admin', 'admin@landacq.id', 'admin123', 'admin', 'Admin Pengawas & Operasional', TRUE),
  ('STF-001', 'Staf Ahli Pertanahan', 'stafahli', 'stafahli@landacq.id', 'staf123', 'staf_ahli', 'Staf Ahli Teknis & Data (Di Bawah Admin)', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO users (id, nama_lengkap, username, email, password_hash, role, unit_kerja, is_active, created_by_admin_id)
VALUES
  ('USR-001', 'User Publik WebGIS', 'user', 'user@landacq.id', 'user123', 'user', 'Pengguna Umum', TRUE, 'MST-001')
ON CONFLICT DO NOTHING;

-- Row Level Security (Mode Prototipe WebGIS Frontend-Only)
-- Catatan: Untuk produksi, batasi policy ini dan gunakan Supabase Auth + Edge Functions / bcrypt.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_requests ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "prototype_all_download_requests" ON download_requests;
CREATE POLICY "prototype_all_download_requests" ON download_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Hak akses tabel untuk role anon & authenticated (wajib di Supabase PostgreSQL)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
