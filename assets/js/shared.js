(() => {
  'use strict';

  // =========================================================================
  // SUPABASE CONFIGURATION (REST API v1)
  // =========================================================================
  const SUPABASE_URL = 'https://nfpkdnxfedwlpysdcnss.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lcoOuZ3bfWlAyzvCRA12Gw_i8-NXJCS';
  const SUPABASE_REST = `${SUPABASE_URL}/rest/v1`;

  const STORAGE_KEYS = {
    admins: 'landacq_db_v2_admins',
    users: 'landacq_db_v2_users',
    parcels: 'landacq_db_v2_parcels',
    row: 'landacq_db_v2_row',
    project: 'landacq_db_v2_project',
    session: 'landacq_db_v2_session',
    logs: 'landacq_db_v2_logs'
  };

  const STATUS_CONFIG = {
    'Bebas/Lunas': {
      color: '#10b981',
      fillOpacity: 0.46,
      badgeClass: 'st-bebas',
      shortLabel: 'Bebas/Lunas'
    },
    'Proses Pembayaran UGR': {
      color: '#3b82f6',
      fillOpacity: 0.46,
      badgeClass: 'st-bayar',
      shortLabel: 'Pembayaran UGR'
    },
    'Negosiasi': {
      color: '#f59e0b',
      fillOpacity: 0.46,
      badgeClass: 'st-nego',
      shortLabel: 'Negosiasi'
    },
    'Sengketa/Kendala': {
      color: '#ef4444',
      fillOpacity: 0.52,
      badgeClass: 'st-sengketa',
      shortLabel: 'Sengketa/Kendala'
    },
    'Belum Diproses': {
      color: '#64748b',
      fillOpacity: 0.40,
      badgeClass: 'st-belum',
      shortLabel: 'Belum Diproses'
    }
  };

  const STATUS_ORDER = [
    'Bebas/Lunas',
    'Proses Pembayaran UGR',
    'Negosiasi',
    'Sengketa/Kendala',
    'Belum Diproses'
  ];

  const RBAC_ROLES = {
    master: {
      label: 'Master',
      color: '#a855f7',
      bannerClass: 'role-master',
      icon: 'crown',
      desc: 'Akses 100% seluruh website: kelola semua akun, lihat email & password pengguna, data persil, log audit, proyek, dan backup DB.',
      canEditCore: true,
      canEditField: true,
      canImport: true,
      canExport: true,
      canReset: true,
      canAccessAdmin: true,
      canManageAccounts: true,
      canViewUserEmails: true,
      canViewPasswords: true,
      canViewLogs: true,
      canManageLogs: true,
      canManageProject: true,
      canBackupRestore: true,
      canSwitchRolePreview: true
    },
    admin: {
      label: 'Admin',
      color: '#10b981',
      bannerClass: 'role-admin',
      icon: 'shield-check',
      desc: 'Pantau log user login & perubahan data, tambah/edit/hapus data persil, konfigurasi proyek, dan lihat email user (tanpa password).',
      canEditCore: true,
      canEditField: true,
      canImport: true,
      canExport: true,
      canReset: false,
      canAccessAdmin: true,
      canManageAccounts: false,
      canViewUserEmails: true,
      canViewPasswords: false,
      canViewLogs: true,
      canManageLogs: false,
      canManageProject: true,
      canBackupRestore: false,
      canSwitchRolePreview: false
    },
    staf_ahli: {
      label: 'Staf Ahli',
      color: '#f59e0b',
      bannerClass: 'role-staf',
      icon: 'briefcase',
      desc: 'Kelola data operasional: menambahkan, mengedit, dan menghapus data bidang persil serta import/export dataset.',
      canEditCore: true,
      canEditField: true,
      canImport: true,
      canExport: true,
      canReset: false,
      canAccessAdmin: true,
      canManageAccounts: false,
      canViewUserEmails: false,
      canViewPasswords: false,
      canViewLogs: false,
      canManageLogs: false,
      canManageProject: false,
      canBackupRestore: false,
      canSwitchRolePreview: false
    },
    user: {
      label: 'User / Pengguna',
      color: '#64748b',
      bannerClass: 'role-user',
      icon: 'eye',
      desc: 'Mode lihat data (Read-Only): memantau peta, dashboard ringkasan, filter wilayah, tabel atribut, dan detail bidang persil.',
      canEditCore: false,
      canEditField: false,
      canImport: false,
      canExport: true,
      canReset: false,
      canAccessAdmin: false,
      canManageAccounts: false,
      canViewUserEmails: false,
      canViewPasswords: false,
      canViewLogs: false,
      canManageLogs: false,
      canManageProject: false,
      canBackupRestore: false,
      canSwitchRolePreview: false
    }
  };

  function normalizeAdminRole(rawRole, usernameOrId = '') {
    const val = String(rawRole || '').trim().toLowerCase();
    if (val === 'master') return 'master';
    if (val === 'admin') return 'admin';
    const hint = String(usernameOrId || '').trim().toLowerCase();
    if (hint === 'master' || hint.startsWith('mst-')) return 'master';
    return 'admin';
  }

  function normalizeUserRole(rawRole) {
    const val = String(rawRole || '').trim().toLowerCase();
    if (val === 'staf_ahli' || val === 'staf ahli' || val === 'surveyor') return 'staf_ahli';
    return 'user';
  }

  function normalizeAnyRole(rawRole) {
    const val = String(rawRole || '').trim().toLowerCase();
    if (val === 'master') return 'master';
    if (val === 'admin') return 'admin';
    if (val === 'staf_ahli' || val === 'staf ahli' || val === 'surveyor') return 'staf_ahli';
    return 'user';
  }

  const schemaCapabilities = {
    adminsHasRole: true
  };

  // =========================================================================
  // IN-MEMORY CACHE + LOCALSTORAGE MIRROR
  // =========================================================================
  const memoryCache = {
    admins: null,
    users: null,
    parcels: null,
    rowFeatures: null,
    project: null,
    logs: null
  };

  const dbStatus = {
    connected: false,
    mode: 'initializing',
    error: null,
    lastSyncAt: null
  };

  const syncTimers = new Map();

  function getDefaultProjectConfig() {
    return {
      name: 'Proyek Pengadaan Lahan',
      code: 'PRJ-001',
      rowWidth: 90,
      targetDate: '',
      region: 'Belum ditentukan',
      centerLat: -6.5458,
      centerLng: 107.7232
    };
  }

  function readStorageJson(key, fallbackFactory) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallbackFactory();
      const parsed = JSON.parse(raw);
      return parsed ?? fallbackFactory();
    } catch (_e) {
      return fallbackFactory();
    }
  }

  function writeStorageJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('localStorage error:', err);
      return false;
    }
  }

  // =========================================================================
  // SUPABASE REST CLIENT (USES PUBLISHABLE KEY IN apikey HEADER)
  // =========================================================================
  async function sbFetch(path, options = {}) {
    const { method = 'GET', body, prefer } = options;
    const headers = {
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Accept': 'application/json'
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (prefer) {
      headers['Prefer'] = prefer;
    }

    const res = await fetch(`${SUPABASE_REST}/${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.message) {
          msg = `${errJson.message}${errJson.hint ? ' — ' + errJson.hint : ''}`;
        }
      } catch (_e) {
        // ignore JSON parse failure
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // =========================================================================
  // ROW MAPPERS (POSTGRESQL <-> FRONTEND MODELS)
  // =========================================================================
  function adminRowToModel(row) {
    return {
      id: row.id,
      nama_lengkap: row.nama_lengkap,
      username: row.username,
      email: row.email,
      password: row.password_hash,
      role: normalizeAdminRole(row.role, row.username || row.id),
      jabatan: row.jabatan || 'Koordinator Pengadaan Tanah',
      is_active: row.is_active !== false,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  function adminModelToRow(obj, includeRole = true) {
    const row = {
      id: obj.id,
      nama_lengkap: obj.nama_lengkap,
      username: obj.username,
      email: obj.email,
      password_hash: obj.password,
      jabatan: obj.jabatan || 'Koordinator Pengadaan Tanah',
      is_active: obj.is_active !== false,
      created_at: obj.created_at || new Date().toISOString(),
      updated_at: obj.updated_at || new Date().toISOString()
    };
    if (includeRole) {
      row.role = normalizeAdminRole(obj.role, obj.username || obj.id);
    }
    return row;
  }

  function userRowToModel(row) {
    return {
      id: row.id,
      nama_lengkap: row.nama_lengkap,
      username: row.username,
      email: row.email,
      password: row.password_hash,
      role: normalizeUserRole(row.role),
      unit_kerja: row.unit_kerja || 'Tim Lapangan',
      is_active: row.is_active !== false,
      created_by_admin_id: row.created_by_admin_id || null,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  function userModelToRow(obj) {
    return {
      id: obj.id,
      nama_lengkap: obj.nama_lengkap,
      username: obj.username,
      email: obj.email,
      password_hash: obj.password,
      role: normalizeUserRole(obj.role),
      unit_kerja: obj.unit_kerja || 'Tim Lapangan',
      is_active: obj.is_active !== false,
      created_by_admin_id: obj.created_by_admin_id || null,
      created_at: obj.created_at || new Date().toISOString(),
      updated_at: obj.updated_at || new Date().toISOString()
    };
  }

  function parcelRowToFeature(row) {
    let geometry = null;
    try {
      geometry = typeof row.geometry_geojson === 'string'
        ? JSON.parse(row.geometry_geojson)
        : row.geometry_geojson;
    } catch (_e) {
      geometry = null;
    }
    return {
      type: 'Feature',
      geometry,
      properties: {
        id_bidang: row.id_bidang,
        nama_pemilik: row.nama_pemilik,
        desa: row.desa_kelurahan,
        luas_m2: Math.max(1, Number(row.luas_m2) || 1),
        nilai_ugr: Math.max(0, Number(row.nilai_ugr) || 0),
        status: normalizeStatus(row.status_akuisisi),
        progres: Math.max(0, Math.min(100, Number(row.persentase_progres) || 0)),
        catatan: row.catatan_lapangan || '-'
      }
    };
  }

  function featureToParcelRow(feature, updatedBy = null) {
    const p = feature.properties || {};
    return {
      id_bidang: String(p.id_bidang).trim(),
      nama_pemilik: String(p.nama_pemilik || 'Tanpa Nama').trim(),
      desa_kelurahan: String(p.desa || 'Wilayah Umum').trim(),
      luas_m2: Math.max(1, Number(p.luas_m2) || 1),
      nilai_ugr: Math.max(0, Number(p.nilai_ugr) || 0),
      status_akuisisi: normalizeStatus(p.status),
      persentase_progres: Math.max(0, Math.min(100, Math.round(Number(p.progres) || 0))),
      catatan_lapangan: String(p.catatan || '-'),
      geometry_geojson: JSON.stringify(feature.geometry),
      updated_by_account_id: updatedBy || null,
      updated_at: new Date().toISOString()
    };
  }

  function projectRowToModel(row) {
    if (!row) return { project: getDefaultProjectConfig(), rowFeatures: [] };
    let rowFeatures = [];
    try {
      rowFeatures = row.row_geojson ? JSON.parse(row.row_geojson) : [];
      if (!Array.isArray(rowFeatures)) rowFeatures = [];
    } catch (_e) {
      rowFeatures = [];
    }
    return {
      project: {
        name: row.nama_proyek || 'Proyek Pengadaan Lahan',
        code: row.kode_proyek || 'PRJ-001',
        rowWidth: Number(row.lebar_row_m) || 90,
        targetDate: row.target_selesai || '',
        region: row.wilayah || 'Belum ditentukan',
        centerLat: Number(row.center_lat ?? -6.5458),
        centerLng: Number(row.center_lng ?? 107.7232)
      },
      rowFeatures
    };
  }

  function logRowToModel(row) {
    return {
      id: row.id,
      date: row.tanggal,
      time: row.waktu,
      actor: row.aktor,
      accountType: row.tipe_akun,
      page: row.halaman,
      text: row.aktivitas
    };
  }

  // =========================================================================
  // INITIALIZE / HYDRATE FROM SUPABASE
  // =========================================================================
  async function initDb() {
    try {
      const [adminsRows, usersRows, parcelRows, projectRows, logRows] = await Promise.all([
        sbFetch('admins?select=*&order=id.asc'),
        sbFetch('users?select=*&order=id.asc'),
        sbFetch('parcels?select=*&order=id_bidang.asc'),
        sbFetch('project_settings?id=eq.1&select=*'),
        sbFetch('audit_logs?select=*&order=id.desc&limit=100')
      ]);

      if (Array.isArray(adminsRows) && adminsRows.length > 0) {
        schemaCapabilities.adminsHasRole = Object.prototype.hasOwnProperty.call(adminsRows[0], 'role');
      }
      memoryCache.admins = (adminsRows || []).map(adminRowToModel);
      memoryCache.users = (usersRows || []).map(userRowToModel);
      memoryCache.parcels = (parcelRows || []).map(parcelRowToFeature).filter(f => f.geometry);

      const { project, rowFeatures } = projectRowToModel((projectRows || [])[0]);
      memoryCache.project = project;
      memoryCache.rowFeatures = rowFeatures;
      memoryCache.logs = (logRows || []).map(logRowToModel);

      // Mirror snapshot to localStorage cache
      writeStorageJson(STORAGE_KEYS.admins, memoryCache.admins);
      writeStorageJson(STORAGE_KEYS.users, memoryCache.users);
      writeStorageJson(STORAGE_KEYS.parcels, memoryCache.parcels);
      writeStorageJson(STORAGE_KEYS.project, memoryCache.project);
      writeStorageJson(STORAGE_KEYS.row, memoryCache.rowFeatures);
      writeStorageJson(STORAGE_KEYS.logs, memoryCache.logs);

      dbStatus.connected = true;
      dbStatus.mode = 'supabase';
      dbStatus.error = null;
      dbStatus.lastSyncAt = new Date().toISOString();
      return true;
    } catch (err) {
      console.error('Supabase initDb gagal, memuat cache lokal:', err);
      dbStatus.connected = false;
      dbStatus.mode = 'error';
      dbStatus.error = err.message || 'Gagal terhubung ke Supabase';

      memoryCache.admins = readStorageJson(STORAGE_KEYS.admins, () => []);
      memoryCache.users = readStorageJson(STORAGE_KEYS.users, () => []);
      memoryCache.parcels = readStorageJson(STORAGE_KEYS.parcels, () => []);
      memoryCache.project = readStorageJson(STORAGE_KEYS.project, getDefaultProjectConfig);
      memoryCache.rowFeatures = readStorageJson(STORAGE_KEYS.row, () => []);
      memoryCache.logs = readStorageJson(STORAGE_KEYS.logs, () => []);
      return false;
    }
  }

  function getDbStatus() {
    return { ...dbStatus };
  }

  // =========================================================================
  // SYNCHRONOUS CACHE ACCESSORS (POPULATED BY initDb)
  // =========================================================================
  function loadAdmins() {
    if (Array.isArray(memoryCache.admins)) return memoryCache.admins;
    return readStorageJson(STORAGE_KEYS.admins, () => []);
  }

  function loadUsers() {
    if (Array.isArray(memoryCache.users)) return memoryCache.users;
    return readStorageJson(STORAGE_KEYS.users, () => []);
  }

  function loadParcels() {
    if (Array.isArray(memoryCache.parcels)) return memoryCache.parcels;
    return readStorageJson(STORAGE_KEYS.parcels, () => []);
  }

  function loadRowFeatures() {
    if (Array.isArray(memoryCache.rowFeatures)) return memoryCache.rowFeatures;
    return readStorageJson(STORAGE_KEYS.row, () => []);
  }

  function loadProjectConfig() {
    if (memoryCache.project) return memoryCache.project;
    return readStorageJson(STORAGE_KEYS.project, getDefaultProjectConfig);
  }

  function loadLogs() {
    if (Array.isArray(memoryCache.logs)) return memoryCache.logs;
    return readStorageJson(STORAGE_KEYS.logs, () => []);
  }

  // =========================================================================
  // ASYNC SUPABASE CRUD OPERATIONS
  // =========================================================================
  function nextRecordId(records, prefix) {
    let maxNum = 0;
    const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    records.forEach(r => {
      const m = String(r.id || '').match(re);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  function isIdentifierTaken(username, email, excludeId = null) {
    const uNorm = String(username || '').trim().toLowerCase();
    const eNorm = String(email || '').trim().toLowerCase();
    const all = [...loadAdmins(), ...loadUsers()];
    return all.some(acc => {
      if (excludeId && acc.id === excludeId) return false;
      const accU = String(acc.username || '').trim().toLowerCase();
      const accE = String(acc.email || '').trim().toLowerCase();
      return (uNorm && (accU === uNorm || accE === uNorm)) || (eNorm && (accU === eNorm || accE === eNorm));
    });
  }

  async function createAdminRecord({ nama_lengkap, username, email, password, role = 'admin', jabatan, is_active = true }) {
    const admins = loadAdmins();
    const nowIso = new Date().toISOString();
    const safeRole = normalizeAdminRole(role, username);
    if (admins.some(a => normalizeAdminRole(a.role, a.username || a.id) === safeRole)) {
      const label = safeRole === 'master' ? 'Master' : 'Admin';
      throw new Error(`Kuota penuh: Role ${label} hanya diperbolehkan 1 akun. Edit akun ${label} yang sudah ada.`);
    }
    const prefix = safeRole === 'master' ? 'MST' : 'ADM';
    const model = {
      id: nextRecordId(admins, prefix),
      nama_lengkap: String(nama_lengkap || '').trim(),
      username: String(username || '').trim(),
      email: String(email || username || '').trim(),
      password: String(password || ''),
      role: safeRole,
      jabatan: String(jabatan || (safeRole === 'master' ? 'Super Administrator & Master' : 'Koordinator Pengadaan Tanah')).trim(),
      is_active: is_active !== false,
      created_at: nowIso,
      updated_at: nowIso
    };
    let inserted;
    try {
      inserted = await sbFetch('admins', {
        method: 'POST',
        prefer: 'return=representation',
        body: adminModelToRow(model, schemaCapabilities.adminsHasRole)
      });
    } catch (err) {
      if (/PGRST204|'role' column/i.test(err.message || '')) {
        schemaCapabilities.adminsHasRole = false;
        if (safeRole === 'master') {
          throw new Error('Kolom "role" pada tabel admins Supabase belum ditambahkan. Jalankan script SQL migrasi dari database/schema.sql di SQL Editor Supabase.');
        }
        inserted = await sbFetch('admins', {
          method: 'POST',
          prefer: 'return=representation',
          body: adminModelToRow(model, false)
        });
      } else {
        throw err;
      }
    }
    const saved = inserted && inserted[0] ? adminRowToModel(inserted[0]) : model;
    admins.push(saved);
    memoryCache.admins = admins;
    writeStorageJson(STORAGE_KEYS.admins, admins);
    return saved;
  }

  async function updateAdminRecord(id, fields) {
    const admins = loadAdmins();
    const idx = admins.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Data admin tidak ditemukan.');
    const merged = { ...admins[idx], ...fields, updated_at: new Date().toISOString() };
    merged.role = normalizeAdminRole(merged.role, merged.username || merged.id);
    if (admins.some((a, i) => i !== idx && normalizeAdminRole(a.role, a.username || a.id) === merged.role)) {
      const label = merged.role === 'master' ? 'Master' : 'Admin';
      throw new Error(`Kuota penuh: Role ${label} hanya diperbolehkan 1 akun.`);
    }
    const buildPayload = includeRole => {
      const row = adminModelToRow(merged, includeRole);
      delete row.id;
      delete row.created_at;
      return row;
    };
    let updated;
    try {
      updated = await sbFetch(`admins?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: buildPayload(schemaCapabilities.adminsHasRole)
      });
    } catch (err) {
      if (/PGRST204|'role' column/i.test(err.message || '')) {
        schemaCapabilities.adminsHasRole = false;
        if (merged.role === 'master') {
          throw new Error('Kolom "role" pada tabel admins Supabase belum ditambahkan. Jalankan script SQL migrasi dari database/schema.sql di SQL Editor Supabase.');
        }
        updated = await sbFetch(`admins?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          prefer: 'return=representation',
          body: buildPayload(false)
        });
      } else {
        throw err;
      }
    }
    admins[idx] = updated && updated[0] ? adminRowToModel(updated[0]) : merged;
    memoryCache.admins = admins;
    writeStorageJson(STORAGE_KEYS.admins, admins);
    return admins[idx];
  }

  async function deleteAdminRecord(id) {
    await sbFetch(`admins?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    const admins = loadAdmins().filter(a => a.id !== id);
    memoryCache.admins = admins;
    writeStorageJson(STORAGE_KEYS.admins, admins);
    return admins;
  }

  async function createUserRecord({ nama_lengkap, username, email, password, role = 'user', unit_kerja, is_active = true, created_by_admin_id = null }) {
    const users = loadUsers();
    const nowIso = new Date().toISOString();
    const safeRole = normalizeUserRole(role);
    if (safeRole === 'staf_ahli' && users.some(u => normalizeUserRole(u.role) === 'staf_ahli')) {
      throw new Error('Kuota penuh: Role Staf Ahli hanya diperbolehkan 1 akun. Edit akun Staf Ahli yang sudah ada.');
    }
    const prefix = safeRole === 'staf_ahli' ? 'STF' : 'USR';
    const validCreator = created_by_admin_id && loadAdmins().some(a => a.id === created_by_admin_id)
      ? created_by_admin_id
      : null;

    const model = {
      id: nextRecordId(users, prefix),
      nama_lengkap: String(nama_lengkap || '').trim(),
      username: String(username || '').trim(),
      email: String(email || username || '').trim(),
      password: String(password || ''),
      role: safeRole,
      unit_kerja: String(unit_kerja || (safeRole === 'staf_ahli' ? 'Tim Staf Ahli' : 'Pengguna Umum')).trim(),
      is_active: is_active !== false,
      created_by_admin_id: validCreator,
      created_at: nowIso,
      updated_at: nowIso
    };
    let inserted;
    try {
      inserted = await sbFetch('users', {
        method: 'POST',
        prefer: 'return=representation',
        body: userModelToRow(model)
      });
    } catch (err) {
      if (/users_role_check|23514/i.test(err.message || '')) {
        throw new Error(`Role '${safeRole}' belum diizinkan pada constraint users_role_check di Supabase. Jalankan blok migrasi database/schema.sql di SQL Editor Supabase.`);
      }
      throw err;
    }
    const saved = inserted && inserted[0] ? userRowToModel(inserted[0]) : model;
    users.push(saved);
    memoryCache.users = users;
    writeStorageJson(STORAGE_KEYS.users, users);
    return saved;
  }

  async function updateUserRecord(id, fields) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Data user tidak ditemukan.');
    const merged = { ...users[idx], ...fields, updated_at: new Date().toISOString() };
    merged.role = normalizeUserRole(merged.role);
    if (merged.role === 'staf_ahli' && users.some((u, i) => i !== idx && normalizeUserRole(u.role) === 'staf_ahli')) {
      throw new Error('Kuota penuh: Role Staf Ahli hanya diperbolehkan 1 akun.');
    }
    const row = userModelToRow(merged);
    delete row.id;
    delete row.created_at;
    let updated;
    try {
      updated = await sbFetch(`users?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: row
      });
    } catch (err) {
      if (/users_role_check|23514/i.test(err.message || '')) {
        throw new Error(`Role '${merged.role}' belum diizinkan pada constraint users_role_check di Supabase. Jalankan blok migrasi database/schema.sql di SQL Editor Supabase.`);
      }
      throw err;
    }
    users[idx] = updated && updated[0] ? userRowToModel(updated[0]) : merged;
    memoryCache.users = users;
    writeStorageJson(STORAGE_KEYS.users, users);
    return users[idx];
  }

  async function deleteUserRecord(id) {
    await sbFetch(`users?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    const users = loadUsers().filter(u => u.id !== id);
    memoryCache.users = users;
    writeStorageJson(STORAGE_KEYS.users, users);
    return users;
  }

  async function upsertParcel(feature, updatedBy = null) {
    const row = featureToParcelRow(feature, updatedBy);
    await sbFetch('parcels?on_conflict=id_bidang', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: row
    });
    const parcels = loadParcels();
    const idx = parcels.findIndex(f => f.properties.id_bidang === row.id_bidang);
    const normalizedFeat = parcelRowToFeature(row);
    if (idx >= 0) parcels[idx] = normalizedFeat;
    else parcels.push(normalizedFeat);
    memoryCache.parcels = parcels;
    writeStorageJson(STORAGE_KEYS.parcels, parcels);
    return normalizedFeat;
  }

  function scheduleParcelSync(feature, updatedBy = null, onError = null) {
    const id = feature && feature.properties && feature.properties.id_bidang;
    if (!id) return;
    writeStorageJson(STORAGE_KEYS.parcels, loadParcels());
    if (syncTimers.has(id)) clearTimeout(syncTimers.get(id));
    const timer = setTimeout(async () => {
      syncTimers.delete(id);
      try {
        const row = featureToParcelRow(feature, updatedBy);
        await sbFetch('parcels?on_conflict=id_bidang', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates',
          body: row
        });
      } catch (err) {
        console.error('Gagal sinkronisasi persil ke Supabase:', err);
        if (typeof onError === 'function') onError(err);
      }
    }, 380);
    syncTimers.set(id, timer);
  }

  async function upsertManyParcels(features, updatedBy = null) {
    const chunkSize = 150;
    for (let i = 0; i < features.length; i += chunkSize) {
      const chunk = features.slice(i, i + chunkSize).map(f => featureToParcelRow(f, updatedBy));
      await sbFetch('parcels?on_conflict=id_bidang', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: chunk
      });
    }
    memoryCache.parcels = features;
    writeStorageJson(STORAGE_KEYS.parcels, features);
    return features;
  }

  async function replaceAllParcels(features, updatedBy = null) {
    await sbFetch('parcels?id_bidang=not.is.null', { method: 'DELETE' });
    if (features.length > 0) {
      await upsertManyParcels(features, updatedBy);
    } else {
      memoryCache.parcels = [];
      writeStorageJson(STORAGE_KEYS.parcels, []);
    }
    return features;
  }

  async function deleteParcelsByIds(ids) {
    if (!ids || !ids.length) return loadParcels();
    const encoded = ids.map(id => encodeURIComponent(`"${String(id).replace(/"/g, '')}"`)).join(',');
    await sbFetch(`parcels?id_bidang=in.(${encoded})`, { method: 'DELETE' });
    const idSet = new Set(ids);
    const remaining = loadParcels().filter(f => !idSet.has(f.properties.id_bidang));
    memoryCache.parcels = remaining;
    writeStorageJson(STORAGE_KEYS.parcels, remaining);
    return remaining;
  }

  async function saveProjectConfig(cfg) {
    const rowFeatures = loadRowFeatures();
    const payload = {
      id: 1,
      nama_proyek: cfg.name || 'Proyek Pengadaan Lahan',
      kode_proyek: cfg.code || 'PRJ-001',
      wilayah: cfg.region || 'Belum ditentukan',
      lebar_row_m: Math.max(10, parseInt(cfg.rowWidth, 10) || 90),
      target_selesai: cfg.targetDate ? cfg.targetDate : null,
      center_lat: Number(cfg.centerLat ?? -6.5458),
      center_lng: Number(cfg.centerLng ?? 107.7232),
      row_geojson: JSON.stringify(rowFeatures),
      updated_at: new Date().toISOString()
    };
    await sbFetch('project_settings?on_conflict=id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: payload
    });
    memoryCache.project = { ...cfg };
    writeStorageJson(STORAGE_KEYS.project, memoryCache.project);
    return memoryCache.project;
  }

  async function saveRowFeatures(features) {
    const cfg = loadProjectConfig();
    memoryCache.rowFeatures = features;
    writeStorageJson(STORAGE_KEYS.row, features);
    await saveProjectConfig(cfg);
    return features;
  }

  async function pushLog(actor, accountType, page, text) {
    const now = new Date();
    const row = {
      tanggal: now.toLocaleDateString('id-ID'),
      waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      aktor: actor || 'Sistem',
      tipe_akun: accountType || 'system',
      halaman: page || 'App',
      aktivitas: text
    };
    const logs = loadLogs();
    const localItem = logRowToModel({ id: Date.now(), ...row });
    logs.unshift(localItem);
    if (logs.length > 100) logs.length = 100;
    memoryCache.logs = logs;
    writeStorageJson(STORAGE_KEYS.logs, logs);

    try {
      const inserted = await sbFetch('audit_logs', {
        method: 'POST',
        prefer: 'return=representation',
        body: row
      });
      if (inserted && inserted[0]) {
        logs[0] = logRowToModel(inserted[0]);
        writeStorageJson(STORAGE_KEYS.logs, logs);
      }
    } catch (err) {
      console.warn('Gagal mencatat audit_logs ke Supabase:', err);
    }
    return logs;
  }

  async function clearLogs() {
    await sbFetch('audit_logs?id=gt.0', { method: 'DELETE' });
    memoryCache.logs = [];
    writeStorageJson(STORAGE_KEYS.logs, []);
    return [];
  }

  // =========================================================================
  // AUTHENTICATION & SESSION
  // =========================================================================
  function authenticateAccount(identifier, password) {
    const idNorm = String(identifier || '').trim().toLowerCase();
    const pwd = String(password || '');

    const adminMatch = loadAdmins().find(a =>
      (String(a.username || '').toLowerCase() === idNorm ||
       String(a.email || '').toLowerCase() === idNorm) &&
      a.password === pwd
    );
    if (adminMatch) {
      return { table: 'admins', account: adminMatch };
    }

    const userMatch = loadUsers().find(u =>
      (String(u.username || '').toLowerCase() === idNorm ||
       String(u.email || '').toLowerCase() === idNorm) &&
      u.password === pwd
    );
    if (userMatch) {
      return { table: 'users', account: userMatch };
    }

    return null;
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.session);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (!sess || !sess.role) return null;
      sess.role = normalizeAnyRole(sess.role);
      sess.originRole = normalizeAnyRole(sess.originRole || sess.role);
      return RBAC_ROLES[sess.role] ? sess : null;
    } catch (_e) {
      return null;
    }
  }

  function saveSession(session) {
    return writeStorageJson(STORAGE_KEYS.session, session);
  }

  function clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEYS.session);
    } catch (_e) {
      // ignore
    }
  }

  function requireAuth(currentPage) {
    const session = loadSession();
    if (!session) {
      const nextParam = currentPage ? `?next=${encodeURIComponent(currentPage)}` : '';
      window.location.replace(`index.html${nextParam}`);
      return null;
    }
    return session;
  }

  function verifySessionWithDb(session, currentPage) {
    if (!session) return false;
    const list = session.table === 'admins' ? loadAdmins() : loadUsers();
    const found = list.find(acc => acc.id === session.accountId);
    if (!found || found.is_active === false) {
      clearSession();
      const nextParam = currentPage ? `?next=${encodeURIComponent(currentPage)}` : '';
      window.location.replace(`index.html${nextParam}`);
      return false;
    }
    return true;
  }

  // =========================================================================
  // GEOSPATIAL HELPERS
  // =========================================================================
  function computeRingAreaSqm(ring) {
    if (!ring || ring.length < 3) return 0;
    const R = 6378137;
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const p1 = ring[i];
      const p2 = ring[(i + 1) % ring.length];
      const lon1 = (p1[0] * Math.PI) / 180;
      const lat1 = (p1[1] * Math.PI) / 180;
      const lon2 = (p2[0] * Math.PI) / 180;
      const lat2 = (p2[1] * Math.PI) / 180;
      area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs((area * R * R) / 2);
  }

  function computeGeometryAreaSqm(geometry) {
    if (!geometry) return 0;
    if (geometry.type === 'Polygon') {
      let total = computeRingAreaSqm(geometry.coordinates[0]);
      for (let i = 1; i < geometry.coordinates.length; i++) {
        total -= computeRingAreaSqm(geometry.coordinates[i]);
      }
      return Math.max(0, total);
    }
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.reduce((sum, poly) => {
        let polyArea = computeRingAreaSqm(poly[0]);
        for (let i = 1; i < poly.length; i++) {
          polyArea -= computeRingAreaSqm(poly[i]);
        }
        return sum + Math.max(0, polyArea);
      }, 0);
    }
    return 0;
  }

  function getGeometryCentroid(geometry) {
    if (!geometry) return [-6.5458, 107.7232];
    let ring = [];
    if (geometry.type === 'Polygon') {
      ring = geometry.coordinates[0] || [];
    } else if (geometry.type === 'MultiPolygon') {
      ring = (geometry.coordinates[0] && geometry.coordinates[0][0]) || [];
    }
    if (!ring.length) return [-6.5458, 107.7232];
    const len = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
    let sumLng = 0;
    let sumLat = 0;
    for (let i = 0; i < len; i++) {
      sumLng += ring[i][0];
      sumLat += ring[i][1];
    }
    return [sumLat / Math.max(1, len), sumLng / Math.max(1, len)];
  }

  function buildRectPolygonFromCenter(centerLat, centerLng, widthMeters, heightMeters) {
    const lat = Number(centerLat);
    const lng = Number(centerLng);
    const w = Math.max(2, Number(widthMeters) || 40);
    const h = Math.max(2, Number(heightMeters) || 40);
    const dLat = (h / 2) / 110574;
    const dLng = (w / 2) / (111320 * Math.cos((lat * Math.PI) / 180));
    const minLng = Number((lng - dLng).toFixed(6));
    const maxLng = Number((lng + dLng).toFixed(6));
    const minLat = Number((lat - dLat).toFixed(6));
    const maxLat = Number((lat + dLat).toFixed(6));
    return {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat]
      ]]
    };
  }

  function parseManualPolygonInput(rawText) {
    const trimmed = String(rawText || '').trim();
    if (!trimmed) {
      throw new Error('Koordinat poligon wajib diisi.');
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.type === 'Feature' && parsed.geometry) {
        if (parsed.geometry.type === 'Polygon' || parsed.geometry.type === 'MultiPolygon') {
          return parsed.geometry;
        }
      }
      if (parsed && (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon')) {
        return parsed;
      }
      if (Array.isArray(parsed) && parsed.length >= 3) {
        const ring = parsed.map(pt => [Number(pt[0]), Number(pt[1])]);
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
        return { type: 'Polygon', coordinates: [ring] };
      }
      throw new Error('JSON harus berupa Geometry Polygon/MultiPolygon atau array koordinat.');
    }

    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) {
      throw new Error('Minimal masukkan 3 titik koordinat (format: lat, lng per baris).');
    }

    const ring = lines.map((line, idx) => {
      const parts = line.split(/[,\s;]+/).filter(Boolean).map(Number);
      if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
        throw new Error(`Format koordinat tidak valid pada baris ke-${idx + 1}. Gunakan format: -6.5450, 107.7210`);
      }
      return [parts[1], parts[0]];
    });

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([...first]);
    }
    return { type: 'Polygon', coordinates: [ring] };
  }

  // =========================================================================
  // FORMATTING & IMPORT NORMALIZATION HELPERS
  // =========================================================================
  function formatNumberID(num, decimals = 0) {
    return Number(num || 0).toLocaleString('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatCurrencyIDR(num) {
    return 'Rp ' + formatNumberID(Math.round(num || 0), 0);
  }

  function formatCompactIDR(num) {
    const val = Number(num || 0);
    if (val >= 1e12) return `Rp ${(val / 1e12).toFixed(2).replace('.', ',')} T`;
    if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(2).replace('.', ',')} M`;
    if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(1).replace('.', ',')} Jt`;
    return formatCurrencyIDR(val);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeStatus(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s.includes('bebas') || s.includes('lunas') || s.includes('clear') || s.includes('selesai')) {
      return 'Bebas/Lunas';
    }
    if (s.includes('pembayaran') || s.includes('bayar') || s.includes('ugr')) {
      return 'Proses Pembayaran UGR';
    }
    if (s.includes('nego') || s.includes('musyawarah')) {
      return 'Negosiasi';
    }
    if (s.includes('sengketa') || s.includes('kendala') || s.includes('dispute') || s.includes('masalah')) {
      return 'Sengketa/Kendala';
    }
    return 'Belum Diproses';
  }

  function parseFlexibleNumber(val) {
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    let s = String(val ?? '').trim();
    if (!s) return NaN;
    s = s.replace(/rp|idr|m2|m²|%|\s/gi, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function pickProp(obj, candidates) {
    if (!obj) return undefined;
    const map = {};
    for (const k of Object.keys(obj)) {
      map[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = obj[k];
    }
    for (const cand of candidates) {
      const norm = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (map[norm] !== undefined && map[norm] !== null && String(map[norm]).trim() !== '') {
        return map[norm];
      }
    }
    return undefined;
  }

  function normalizeImportedFeature(feature, idx, existingIds) {
    const p = feature.properties || {};
    let rawId = pickProp(p, ['id_bidang', 'id_persil', 'no_persil', 'parcel_id', 'id', 'fid', 'objectid']);
    let idBidang = rawId ? String(rawId).trim() : `PRS-${String(idx + 1).padStart(3, '0')}`;
    if (existingIds.has(idBidang)) {
      idBidang = `${idBidang}-${idx + 1}`;
    }
    existingIds.add(idBidang);

    const pemilik = String(pickProp(p, ['nama_pemilik', 'pemilik', 'owner', 'nama', 'name']) || 'Belum Terdata').trim();
    const desa = String(pickProp(p, ['desa', 'kelurahan', 'desa_kelurahan', 'village', 'kecamatan']) || 'Wilayah Impor').trim();
    const parsedArea = parseFlexibleNumber(pickProp(p, ['luas_m2', 'luas', 'area_m2', 'area', 'shape_area']));
    const computedArea = computeGeometryAreaSqm(feature.geometry);
    const luasM2 = Number.isFinite(parsedArea) && parsedArea > 0 ? Math.round(parsedArea) : Math.max(1, Math.round(computedArea));

    const parsedUgr = parseFlexibleNumber(pickProp(p, ['nilai_ugr', 'ugr', 'nilai', 'kompensasi', 'harga', 'budget']));
    const nilaiUgr = Number.isFinite(parsedUgr) && parsedUgr >= 0 ? Math.round(parsedUgr) : 0;

    const status = normalizeStatus(pickProp(p, ['status_akuisisi', 'status', 'status_pembebasan']));
    const parsedProg = parseFlexibleNumber(pickProp(p, ['progres', 'persentase_progres', 'progress', 'persentase']));
    const defaultProg = status === 'Bebas/Lunas' ? 100 : status === 'Proses Pembayaran UGR' ? 80 : status === 'Negosiasi' ? 50 : status === 'Sengketa/Kendala' ? 25 : 0;
    const progres = Number.isFinite(parsedProg) ? Math.max(0, Math.min(100, Math.round(parsedProg))) : defaultProg;

    const catatan = String(pickProp(p, ['catatan_lapangan', 'catatan', 'notes', 'note', 'keterangan']) || '-').trim();

    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        id_bidang: idBidang,
        nama_pemilik: pemilik,
        desa,
        luas_m2: luasM2,
        nilai_ugr: nilaiUgr,
        status,
        progres,
        catatan
      }
    };
  }

  // =========================================================================
  // SHARED IMPORT / EXPORT / BACKUP & TOAST
  // =========================================================================
  function showToast(stackEl, message, type = 'info') {
    if (!stackEl) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconSvg = type === 'success'
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : type === 'error'
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
      : type === 'warn'
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    toast.innerHTML = `${iconSvg}<span style="flex:1">${escapeHtml(message)}</span>`;
    stackEl.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 3600);
  }

  function triggerBlobDownload(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportFeaturesToGeoJSON(features, scopeKey = 'all') {
    const fc = {
      type: 'FeatureCollection',
      name: 'Land_Acquisition_Parcels',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features: features.map(f => ({
        type: 'Feature',
        properties: { ...f.properties },
        geometry: f.geometry
      }))
    };
    triggerBlobDownload(
      JSON.stringify(fc, null, 2),
      'application/geo+json;charset=utf-8',
      `landacq_persil_${scopeKey}_${new Date().toISOString().slice(0, 10)}.geojson`
    );
  }

  function exportFeaturesToExcel(features, scopeLabel, roleLabel, scopeKey = 'all') {
    if (typeof XLSX === 'undefined') {
      throw new Error('Library SheetJS (XLSX) belum termuat. Periksa koneksi internet.');
    }
    const rows = features.map(f => {
      const p = f.properties;
      return {
        'ID Bidang': p.id_bidang,
        'Nama Pemilik': p.nama_pemilik,
        'Desa/Kelurahan': p.desa,
        'Luas (m²)': Number(p.luas_m2) || 0,
        'Luas (Ha)': Number(((Number(p.luas_m2) || 0) / 10000).toFixed(4)),
        'Nilai UGR (Rp)': Number(p.nilai_ugr) || 0,
        'Status Akuisisi': p.status,
        'Progres (%)': Number(p.progres) || 0,
        'Catatan Lapangan': p.catatan
      };
    });

    const wsData = XLSX.utils.json_to_sheet(rows);
    wsData['!cols'] = [
      { wch: 13 }, { wch: 24 }, { wch: 20 }, { wch: 13 },
      { wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 42 }
    ];

    const totalLuas = features.reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
    const totalUgr = features.reduce((s, f) => s + (Number(f.properties.nilai_ugr) || 0), 0);
    const bebasLuas = features.filter(f => f.properties.status === 'Bebas/Lunas').reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);

    const summaryAoa = [
      ['LAPORAN CAPAIAN PEMBEBASAN LAHAN (LANDACQ WEBGIS)'],
      ['Tanggal Export', new Date().toLocaleString('id-ID')],
      ['Cakupan Data', scopeLabel],
      ['Diekspor Oleh', roleLabel],
      [],
      ['RINGKASAN KPI', 'NILAI'],
      ['Total Bidang Persil', features.length],
      ['Total Luas Lahan (m²)', totalLuas],
      ['Total Luas Lahan (Ha)', Number((totalLuas / 10000).toFixed(4))],
      ['Luas Terbebaskan (m²)', bebasLuas],
      ['Persentase Terbebaskan (%)', totalLuas > 0 ? Number(((bebasLuas / totalLuas) * 100).toFixed(2)) : 0],
      ['Total Anggaran UGR (Rp)', totalUgr],
      [],
      ['STATUS AKUISISI', 'JUMLAH BIDANG', 'TOTAL LUAS (m²)', 'TOTAL LUAS (Ha)', 'PERSENTASE LUAS (%)', 'TOTAL UGR (Rp)']
    ];

    STATUS_ORDER.forEach(st => {
      const matched = features.filter(f => f.properties.status === st);
      const sLuas = matched.reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
      const sUgr = matched.reduce((s, f) => s + (Number(f.properties.nilai_ugr) || 0), 0);
      const pct = totalLuas > 0 ? Number(((sLuas / totalLuas) * 100).toFixed(2)) : 0;
      summaryAoa.push([st, matched.length, sLuas, Number((sLuas / 10000).toFixed(4)), pct, sUgr]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, 'Data Persil');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Capaian');

    XLSX.writeFile(wb, `laporan_pembebasan_lahan_${scopeKey}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function downloadExcelTemplate(parcels) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Library SheetJS (XLSX) belum termuat.');
    }
    const rows = parcels.length > 0
      ? parcels.slice(0, 10).map(f => ({
          'ID Bidang': f.properties.id_bidang,
          'Nama Pemilik': f.properties.nama_pemilik,
          'Desa/Kelurahan': f.properties.desa,
          'Luas (m²)': f.properties.luas_m2,
          'Nilai UGR (Rp)': f.properties.nilai_ugr,
          'Status Akuisisi': f.properties.status,
          'Progres (%)': f.properties.progres,
          'Catatan Lapangan': f.properties.catatan
        }))
      : [{
          'ID Bidang': '',
          'Nama Pemilik': '',
          'Desa/Kelurahan': '',
          'Luas (m²)': '',
          'Nilai UGR (Rp)': '',
          'Status Akuisisi': 'Belum Diproses',
          'Progres (%)': 0,
          'Catatan Lapangan': ''
        }];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 13 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 36 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Persil');
    XLSX.writeFile(wb, 'template_update_persil_landacq.xlsx');
  }

  async function parseUploadedDatasetFile(file, existingParcels) {
    if (!file) throw new Error('Tidak ada file dipilih.');
    const name = file.name.toLowerCase();

    if (name.endsWith('.geojson') || name.endsWith('.json')) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      let features = [];
      if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        features = parsed.features;
      } else if (parsed.type === 'Feature') {
        features = [parsed];
      } else if (Array.isArray(parsed)) {
        features = parsed;
      }
      const polyFeatures = features.filter(
        f => f && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      if (!polyFeatures.length) {
        throw new Error('Dataset tidak memiliki fitur geometri Polygon / MultiPolygon persil.');
      }
      const usedIds = new Set();
      return {
        mode: 'replace',
        sourceLabel: 'GeoJSON',
        parcels: polyFeatures.map((feat, i) => normalizeImportedFeature(feat, i, usedIds))
      };
    }

    if (name.endsWith('.zip')) {
      if (typeof shp === 'undefined') {
        throw new Error('Library shpjs gagal dimuat. Periksa koneksi internet Anda.');
      }
      const buffer = await file.arrayBuffer();
      const parsed = await shp(buffer);
      let features = [];
      if (Array.isArray(parsed)) {
        parsed.forEach(fc => {
          if (fc && Array.isArray(fc.features)) features.push(...fc.features);
        });
      } else if (parsed && Array.isArray(parsed.features)) {
        features = parsed.features;
      }
      const polyFeatures = features.filter(
        f => f && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      if (!polyFeatures.length) {
        throw new Error('Shapefile tidak memiliki fitur geometri Polygon / MultiPolygon persil.');
      }
      const usedIds = new Set();
      return {
        mode: 'replace',
        sourceLabel: 'Shapefile (.zip)',
        parcels: polyFeatures.map((feat, i) => normalizeImportedFeature(feat, i, usedIds))
      };
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') {
        throw new Error('Library SheetJS (XLSX) gagal dimuat.');
      }
      if (!existingParcels.length) {
        throw new Error('Belum ada data persil spasial di database. Import GeoJSON/Shapefile atau tambah persil manual terlebih dahulu.');
      }
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const targetSheetName = wb.SheetNames.includes('Data Persil') ? 'Data Persil' : wb.SheetNames[0];
      const sheet = wb.Sheets[targetSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows.length) {
        throw new Error('File Excel kosong atau tidak memiliki baris data.');
      }

      const clonedParcels = existingParcels.map(f => ({
        ...f,
        properties: { ...f.properties }
      }));
      const parcelById = new Map();
      clonedParcels.forEach(f => {
        parcelById.set(String(f.properties.id_bidang).trim().toUpperCase(), f);
      });

      const changedFeatures = [];
      let updatedCount = 0;
      let unmatchedCount = 0;

      rows.forEach(row => {
        const rawId = pickProp(row, ['id_bidang', 'idbidang', 'id_persil', 'id', 'no_persil', 'kode_persil']);
        if (!rawId) return;
        const idKey = String(rawId).trim().toUpperCase();
        if (idKey === 'TOTAL') return;

        const parcel = parcelById.get(idKey);
        if (!parcel) {
          unmatchedCount++;
          return;
        }

        const p = parcel.properties;
        const pemilik = pickProp(row, ['nama_pemilik', 'pemilik', 'owner', 'nama']);
        const desa = pickProp(row, ['desa', 'kelurahan', 'desa_kelurahan', 'desakelurahan', 'village']);
        const luas = parseFlexibleNumber(pickProp(row, ['luas_m2', 'luasm2', 'luas', 'area_m2', 'area']));
        const ugr = parseFlexibleNumber(pickProp(row, ['nilai_ugr', 'nilaiugr', 'nilai_ugr_rp', 'ugr', 'nilai']));
        const statusRaw = pickProp(row, ['status_akuisisi', 'statusakuisisi', 'status']);
        const progRaw = parseFlexibleNumber(pickProp(row, ['progres', 'persentase_progres', 'progress']));
        const catatan = pickProp(row, ['catatan_lapangan', 'catatanlapangan', 'catatan', 'notes', 'keterangan']);

        if (pemilik !== undefined) p.nama_pemilik = String(pemilik).trim();
        if (desa !== undefined) p.desa = String(desa).trim();
        if (Number.isFinite(luas) && luas > 0) p.luas_m2 = Math.round(luas);
        if (Number.isFinite(ugr) && ugr >= 0) p.nilai_ugr = Math.round(ugr);
        if (statusRaw !== undefined) p.status = normalizeStatus(statusRaw);
        if (Number.isFinite(progRaw)) p.progres = Math.max(0, Math.min(100, Math.round(progRaw)));
        if (catatan !== undefined) p.catatan = String(catatan).trim();

        changedFeatures.push(parcel);
        updatedCount++;
      });

      if (updatedCount === 0) {
        throw new Error(`Tidak ada ID Bidang yang cocok dengan database aktif (${unmatchedCount} baris tidak ditemukan).`);
      }

      return {
        mode: 'update',
        sourceLabel: 'Excel (.xlsx)',
        parcels: clonedParcels,
        changedFeatures,
        updatedCount,
        unmatchedCount
      };
    }

    throw new Error('Format file tidak didukung. Gunakan .geojson, .json, .zip, atau .xlsx.');
  }

  async function parseUploadedRowFile(file) {
    if (!file) throw new Error('Tidak ada file dipilih.');
    const text = await file.text();
    const parsed = JSON.parse(text);
    let features = [];
    if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
      features = parsed.features;
    } else if (parsed.type === 'Feature') {
      features = [parsed];
    } else if (Array.isArray(parsed)) {
      features = parsed;
    }
    const valid = features.filter(f => f && f.geometry && (
      f.geometry.type === 'LineString' ||
      f.geometry.type === 'MultiLineString' ||
      f.geometry.type === 'Polygon' ||
      f.geometry.type === 'MultiPolygon'
    ));
    if (!valid.length) {
      throw new Error('File GeoJSON tidak memiliki geometri LineString atau Polygon untuk trase ROW.');
    }
    return valid;
  }

  function exportDatabaseBackupJson() {
    const dump = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      source: SUPABASE_URL,
      tables: {
        admins: loadAdmins(),
        users: loadUsers(),
        parcels: loadParcels(),
        row_features: loadRowFeatures(),
        project_settings: loadProjectConfig(),
        audit_logs: loadLogs()
      }
    };
    triggerBlobDownload(
      JSON.stringify(dump, null, 2),
      'application/json;charset=utf-8',
      `landacq_supabase_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  async function importDatabaseBackupJson(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const t = parsed && parsed.tables;
    if (!t || !Array.isArray(t.admins) || !Array.isArray(t.users) || !Array.isArray(t.parcels)) {
      throw new Error('Format file backup database tidak valid (harus memiliki tables.admins, tables.users, tables.parcels).');
    }

    if (t.admins.length > 0) {
      await sbFetch('admins?on_conflict=id', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: t.admins.map(adminModelToRow)
      });
    }
    if (t.users.length > 0) {
      await sbFetch('users?on_conflict=id', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: t.users.map(userModelToRow)
      });
    }
    await replaceAllParcels(t.parcels, null);
    if (Array.isArray(t.row_features)) {
      memoryCache.rowFeatures = t.row_features;
    }
    if (t.project_settings) {
      await saveProjectConfig(t.project_settings);
    }
    await initDb();
    return t;
  }

  async function clearOperationalTables() {
    await replaceAllParcels([], null);
    await saveRowFeatures([]);
    await clearLogs();
  }

  /** Verifies current credentials and updates the signed-in account's own password across any role. */
  async function changeAccountPassword(session, currentPassword, newPassword) {
    if (!session || !session.accountId || !session.table) {
      throw new Error('Sesi akun tidak valid. Silakan masuk ulang.');
    }
    const curPwd = String(currentPassword || '');
    const nextPwd = String(newPassword || '');
    if (!curPwd) {
      throw new Error('Kata sandi saat ini wajib diisi.');
    }
    if (nextPwd.length < 6) {
      throw new Error('Kata sandi baru minimal 6 karakter.');
    }
    if (nextPwd === curPwd) {
      throw new Error('Kata sandi baru tidak boleh sama dengan kata sandi saat ini.');
    }

    const table = session.table === 'admins' ? 'admins' : 'users';
    const id = session.accountId;

    const rows = await sbFetch(`${table}?id=eq.${encodeURIComponent(id)}&select=id,password_hash,nama_lengkap,username`);
    const record = Array.isArray(rows) ? rows[0] : null;
    if (!record) {
      throw new Error('Akun tidak ditemukan di database Supabase.');
    }
    if (String(record.password_hash || '') !== curPwd) {
      throw new Error('Kata sandi saat ini tidak sesuai.');
    }

    if (table === 'admins') {
      await updateAdminRecord(id, { password: nextPwd });
    } else {
      await updateUserRecord(id, { password: nextPwd });
    }
    return true;
  }

  /** Lazily mounts and binds one shared Change Password modal usable across WebGIS pages. */
  function bindChangePasswordUI({ buttonEl, session, pageName, toastStack, onSuccess }) {
    if (!buttonEl || !session) return;

    let backdrop = document.getElementById('sharedChangePwdModal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sharedChangePwdModal';
      backdrop.className = 'modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'sharedChangePwdTitle');

      const roleKey = normalizeAnyRole(session.originRole || session.role);
      const roleMeta = RBAC_ROLES[roleKey] || RBAC_ROLES.user;

      backdrop.innerHTML = `
        <div class="modal-card" style="max-width: 440px;">
          <div class="modal-head">
            <span id="sharedChangePwdTitle" class="modal-title">
              <i data-lucide="key-round" width="15" height="15" style="color: var(--accent-cyan);"></i>
              Ganti Kata Sandi Akun
            </span>
            <button id="sharedBtnClosePwdModal" class="btn btn-icon btn-sm" type="button" title="Tutup">
              <i data-lucide="x" width="14" height="14"></i>
            </button>
          </div>
          <form id="sharedChangePwdForm" class="modal-body">
            <div style="padding: 8px 10px; background: rgba(15, 23, 42, 0.72); border: 1px solid var(--border-subtle); font-size: 11.5px; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <strong style="color: var(--text-primary);">${escapeHtml(session.name || '')}</strong>
                <span class="status-badge" style="border-color: ${roleMeta.color}; color: ${roleMeta.color}; background: rgba(15,23,42,0.85);">
                  ${escapeHtml(roleMeta.label)}
                </span>
              </div>
              <div class="mono" style="font-size: 10.5px; color: var(--text-secondary);">
                ${escapeHtml(session.username || '')} &bull; ${escapeHtml(session.email || '')}
              </div>
            </div>

            <div id="sharedPwdAlert" style="display: none; padding: 8px 10px; background: rgba(127, 29, 29, 0.35); border: 1px solid rgba(248, 113, 113, 0.5); border-left: 3px solid var(--st-sengketa); color: #fca5a5; font-size: 11.5px;"></div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="field-label" for="sharedCurPwd">Kata Sandi Saat Ini</label>
              <div class="input-wrap">
                <input id="sharedCurPwd" class="input mono" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi lama..." style="padding-right: 30px;" required />
                <button type="button" class="clear-search-btn shared-toggle-pwd" data-target="sharedCurPwd" style="display: flex;" title="Tampilkan/Sembunyikan">
                  <i data-lucide="eye" width="13" height="13"></i>
                </button>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="field-label" for="sharedNewPwd">Kata Sandi Baru</label>
              <div class="input-wrap">
                <input id="sharedNewPwd" class="input mono" type="password" autocomplete="new-password" minlength="6" placeholder="Minimal 6 karakter" style="padding-right: 30px;" required />
                <button type="button" class="clear-search-btn shared-toggle-pwd" data-target="sharedNewPwd" style="display: flex;" title="Tampilkan/Sembunyikan">
                  <i data-lucide="eye" width="13" height="13"></i>
                </button>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="field-label" for="sharedConfirmPwd">Konfirmasi Kata Sandi Baru</label>
              <div class="input-wrap">
                <input id="sharedConfirmPwd" class="input mono" type="password" autocomplete="new-password" minlength="6" placeholder="Ulangi kata sandi baru..." style="padding-right: 30px;" required />
                <button type="button" class="clear-search-btn shared-toggle-pwd" data-target="sharedConfirmPwd" style="display: flex;" title="Tampilkan/Sembunyikan">
                  <i data-lucide="eye" width="13" height="13"></i>
                </button>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px;">
              <button id="sharedBtnCancelPwdModal" type="button" class="btn">Batal</button>
              <button id="sharedBtnSubmitPwd" type="submit" class="btn btn-success">
                <i data-lucide="save" width="14" height="14"></i> Simpan Sandi Baru
              </button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    const form = backdrop.querySelector('#sharedChangePwdForm');
    const alertBox = backdrop.querySelector('#sharedPwdAlert');
    const curInput = backdrop.querySelector('#sharedCurPwd');
    const newInput = backdrop.querySelector('#sharedNewPwd');
    const confInput = backdrop.querySelector('#sharedConfirmPwd');
    const btnClose = backdrop.querySelector('#sharedBtnClosePwdModal');
    const btnCancel = backdrop.querySelector('#sharedBtnCancelPwdModal');
    const btnSubmit = backdrop.querySelector('#sharedBtnSubmitPwd');

    function resetModal() {
      form.reset();
      [curInput, newInput, confInput].forEach(inp => { inp.type = 'password'; });
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }

    function openModal() {
      resetModal();
      backdrop.classList.add('open');
      if (typeof lucide !== 'undefined') lucide.createIcons();
      curInput.focus();
    }

    function closeModal() {
      backdrop.classList.remove('open');
    }

    buttonEl.addEventListener('click', openModal);
    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) {
        closeModal();
      }
    });

    backdrop.querySelectorAll('.shared-toggle-pwd').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetInput = backdrop.querySelector(`#${btn.getAttribute('data-target')}`);
        if (!targetInput) return;
        targetInput.type = targetInput.type === 'password' ? 'text' : 'password';
      });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      alertBox.style.display = 'none';
      const curPwd = curInput.value;
      const newPwd = newInput.value;
      const confPwd = confInput.value;

      if (newPwd !== confPwd) {
        alertBox.textContent = 'Konfirmasi kata sandi baru tidak cocok.';
        alertBox.style.display = 'block';
        return;
      }

      btnSubmit.disabled = true;
      try {
        await changeAccountPassword(session, curPwd, newPwd);
        try {
          await pushLog(session.name, session.table || session.originRole || 'users', pageName || 'Akun', 'Mengubah kata sandi akun sendiri.');
        } catch (_err) {}
        closeModal();
        if (toastStack) {
          showToast(toastStack, 'Kata sandi akun berhasil diperbarui di Supabase.', 'success');
        }
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      } catch (err) {
        alertBox.textContent = err.message || 'Gagal mengganti kata sandi.';
        alertBox.style.display = 'block';
      } finally {
        btnSubmit.disabled = false;
      }
    });
  }

  window.LANDACQ = {
    SUPABASE_URL,
    STATUS_CONFIG,
    STATUS_ORDER,
    RBAC_ROLES,
    initDb,
    getDbStatus,
    getDefaultProjectConfig,
    loadAdmins,
    loadUsers,
    loadParcels,
    loadRowFeatures,
    loadProjectConfig,
    loadLogs,
    saveProjectConfig,
    saveRowFeatures,
    pushLog,
    clearLogs,
    isIdentifierTaken,
    createAdminRecord,
    updateAdminRecord,
    deleteAdminRecord,
    createUserRecord,
    updateUserRecord,
    deleteUserRecord,
    changeAccountPassword,
    bindChangePasswordUI,
    upsertParcel,
    scheduleParcelSync,
    upsertManyParcels,
    replaceAllParcels,
    deleteParcelsByIds,
    authenticateAccount,
    loadSession,
    saveSession,
    clearSession,
    requireAuth,
    verifySessionWithDb,
    normalizeAdminRole,
    normalizeUserRole,
    normalizeAnyRole,
    computeGeometryAreaSqm,
    getGeometryCentroid,
    buildRectPolygonFromCenter,
    parseManualPolygonInput,
    formatNumberID,
    formatCurrencyIDR,
    formatCompactIDR,
    escapeHtml,
    normalizeStatus,
    showToast,
    exportFeaturesToGeoJSON,
    exportFeaturesToExcel,
    downloadExcelTemplate,
    parseUploadedDatasetFile,
    parseUploadedRowFile,
    exportDatabaseBackupJson,
    importDatabaseBackupJson,
    clearOperationalTables
  };
})();
