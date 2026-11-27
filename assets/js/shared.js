(() => {
  'use strict';

  const STORAGE_KEYS = {
    admins: 'landacq_db_v2_admins',
    users: 'landacq_db_v2_users',
    parcels: 'landacq_db_v2_parcels',
    row: 'landacq_db_v2_row',
    project: 'landacq_db_v2_project',
    session: 'landacq_db_v2_session',
    logs: 'landacq_db_v2_logs'
  };

  const IDB_NAME = 'LANDACQ_MANUAL_DB';
  const IDB_VERSION = 1;
  const IDB_STORES = ['admins', 'users', 'parcels', 'settings', 'logs'];

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
    admin: {
      label: 'Admin / Koordinator',
      color: '#10b981',
      bannerClass: 'role-admin',
      icon: 'shield-check',
      desc: 'Akses penuh: kelola tabel admin, tabel user, data persil, nilai UGR, dan import/export dataset.',
      canEditCore: true,
      canEditField: true,
      canImport: true,
      canReset: true,
      canAccessAdmin: true
    },
    surveyor: {
      label: 'Surveyor / Lapangan',
      color: '#f59e0b',
      bannerClass: 'role-surveyor',
      icon: 'hard-hat',
      desc: 'Terbatas lapangan: hanya ubah status akuisisi, progres, dan catatan lapangan.',
      canEditCore: false,
      canEditField: true,
      canImport: false,
      canReset: false,
      canAccessAdmin: false
    },
    viewer: {
      label: 'Viewer / Eksekutif',
      color: '#64748b',
      bannerClass: 'role-viewer',
      icon: 'eye',
      desc: 'Mode read-only: melihat peta, dashboard, filter, dan export laporan.',
      canEditCore: false,
      canEditField: false,
      canImport: false,
      canReset: false,
      canAccessAdmin: false
    }
  };

  // =========================================================================
  // INDEXEDDB + LOCALSTORAGE SYNCHRONIZED ENGINE
  // =========================================================================
  let idbInstance = null;
  const memoryCache = {
    parcels: null
  };

  function openIndexedDb() {
    return new Promise(resolve => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          IDB_STORES.forEach(name => {
            if (!db.objectStoreNames.contains(name)) {
              const keyPath = name === 'parcels' ? 'id_bidang' : 'id';
              db.createObjectStore(name, { keyPath });
            }
          });
        };
        req.onsuccess = e => {
          idbInstance = e.target.result;
          resolve(idbInstance);
        };
        req.onerror = () => resolve(null);
      } catch (_e) {
        resolve(null);
      }
    });
  }

  function syncStoreToIdb(storeName, records) {
    if (!idbInstance) return Promise.resolve(false);
    return new Promise(resolve => {
      try {
        const tx = idbInstance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        records.forEach(rec => store.put(rec));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (_e) {
        resolve(false);
      }
    });
  }

  function readAllFromIdb(storeName) {
    if (!idbInstance) return Promise.resolve([]);
    return new Promise(resolve => {
      try {
        const tx = idbInstance.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (_e) {
        resolve([]);
      }
    });
  }

  async function initDb() {
    await openIndexedDb();
    if (idbInstance) {
      const idbParcels = await readAllFromIdb('parcels');
      if (idbParcels.length > 0) {
        memoryCache.parcels = idbParcels.map(rec => ({
          type: 'Feature',
          geometry: rec.geometry,
          properties: rec.properties
        }));
      } else {
        const lsParcels = readStorageJson(STORAGE_KEYS.parcels, () => []);
        if (lsParcels.length > 0) {
          memoryCache.parcels = lsParcels;
          await syncStoreToIdb('parcels', lsParcels.map(f => ({ id_bidang: f.properties.id_bidang, ...f })));
        }
      }
      await syncStoreToIdb('admins', loadAdmins());
      await syncStoreToIdb('users', loadUsers());
      await syncStoreToIdb('logs', loadLogs());
    }
    return true;
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
      console.warn('localStorage penuh atau tidak tersedia:', err);
      return false;
    }
  }

  // =========================================================================
  // DEFAULT CONFIG & TEMPORARY DUMMY ADMIN
  // =========================================================================
  function getDefaultDummyAdmin() {
    const nowIso = new Date().toISOString();
    return [{
      id: 'ADM-001',
      nama_lengkap: 'Administrator Sistem',
      username: 'admin',
      email: 'admin@landacq.id',
      password: 'admin123',
      role: 'admin',
      jabatan: 'Koordinator Pengadaan Tanah',
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso
    }];
  }

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

  // =========================================================================
  // TABLE ACCESSORS: ADMINS, USERS, PARCELS, ROW, PROJECT, LOGS, SESSION
  // =========================================================================
  function loadAdmins() {
    const list = readStorageJson(STORAGE_KEYS.admins, () => []);
    if (!Array.isArray(list) || list.length === 0) {
      const seed = getDefaultDummyAdmin();
      writeStorageJson(STORAGE_KEYS.admins, seed);
      return seed;
    }
    return list;
  }

  function saveAdmins(admins) {
    const ok = writeStorageJson(STORAGE_KEYS.admins, admins);
    syncStoreToIdb('admins', admins);
    return ok;
  }

  function loadUsers() {
    return readStorageJson(STORAGE_KEYS.users, () => []);
  }

  function saveUsers(users) {
    const ok = writeStorageJson(STORAGE_KEYS.users, users);
    syncStoreToIdb('users', users);
    return ok;
  }

  function loadParcels() {
    if (Array.isArray(memoryCache.parcels)) {
      return memoryCache.parcels;
    }
    const list = readStorageJson(STORAGE_KEYS.parcels, () => []);
    memoryCache.parcels = list;
    return list;
  }

  function saveParcels(parcels) {
    memoryCache.parcels = parcels;
    const ok = writeStorageJson(STORAGE_KEYS.parcels, parcels);
    syncStoreToIdb('parcels', parcels.map(f => ({
      id_bidang: f.properties.id_bidang,
      type: 'Feature',
      properties: f.properties,
      geometry: f.geometry
    })));
    return ok;
  }

  function loadRowFeatures() {
    return readStorageJson(STORAGE_KEYS.row, () => []);
  }

  function saveRowFeatures(features) {
    const ok = writeStorageJson(STORAGE_KEYS.row, features);
    syncStoreToIdb('settings', [
      { id: 'project', value: loadProjectConfig() },
      { id: 'row', value: features }
    ]);
    return ok;
  }

  function loadProjectConfig() {
    return readStorageJson(STORAGE_KEYS.project, getDefaultProjectConfig);
  }

  function saveProjectConfig(cfg) {
    const ok = writeStorageJson(STORAGE_KEYS.project, cfg);
    syncStoreToIdb('settings', [
      { id: 'project', value: cfg },
      { id: 'row', value: loadRowFeatures() }
    ]);
    return ok;
  }

  function loadLogs() {
    return readStorageJson(STORAGE_KEYS.logs, () => []);
  }

  function pushLog(actor, accountType, page, text) {
    const logs = loadLogs();
    const now = new Date();
    logs.unshift({
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: now.toLocaleDateString('id-ID'),
      actor: actor || 'Sistem',
      accountType: accountType || 'system',
      page: page || 'App',
      text
    });
    if (logs.length > 100) logs.length = 100;
    writeStorageJson(STORAGE_KEYS.logs, logs);
    syncStoreToIdb('logs', logs);
    return logs;
  }

  function clearLogs() {
    writeStorageJson(STORAGE_KEYS.logs, []);
    syncStoreToIdb('logs', []);
    return [];
  }

  // =========================================================================
  // AUTHENTICATION & ACCOUNT HELPERS (SEPARATE ADMINS & USERS TABLES)
  // =========================================================================
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

  function nextRecordId(records, prefix) {
    let maxNum = 0;
    const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    records.forEach(r => {
      const m = String(r.id || '').match(re);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  function createAdminRecord({ nama_lengkap, username, email, password, jabatan, is_active = true }) {
    const admins = loadAdmins();
    const nowIso = new Date().toISOString();
    const record = {
      id: nextRecordId(admins, 'ADM'),
      nama_lengkap: String(nama_lengkap || '').trim(),
      username: String(username || '').trim(),
      email: String(email || username || '').trim(),
      password: String(password || ''),
      role: 'admin',
      jabatan: String(jabatan || 'Koordinator Pengadaan Tanah').trim(),
      is_active: is_active !== false,
      created_at: nowIso,
      updated_at: nowIso
    };
    admins.push(record);
    saveAdmins(admins);
    return record;
  }

  function createUserRecord({ nama_lengkap, username, email, password, role, unit_kerja, is_active = true, created_by_admin_id = null }) {
    const users = loadUsers();
    const nowIso = new Date().toISOString();
    const safeRole = role === 'viewer' ? 'viewer' : 'surveyor';
    const record = {
      id: nextRecordId(users, 'USR'),
      nama_lengkap: String(nama_lengkap || '').trim(),
      username: String(username || '').trim(),
      email: String(email || username || '').trim(),
      password: String(password || ''),
      role: safeRole,
      unit_kerja: String(unit_kerja || 'Tim Lapangan').trim(),
      is_active: is_active !== false,
      created_by_admin_id,
      created_at: nowIso,
      updated_at: nowIso
    };
    users.push(record);
    saveUsers(users);
    return record;
  }

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
      return sess && sess.role && RBAC_ROLES[sess.role] ? sess : null;
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
    // Verify account still exists & active in either admins or users table
    const list = session.table === 'admins' ? loadAdmins() : loadUsers();
    const found = list.find(acc => acc.id === session.accountId);
    if (!found || found.is_active === false) {
      clearSession();
      const nextParam = currentPage ? `?next=${encodeURIComponent(currentPage)}` : '';
      window.location.replace(`index.html${nextParam}`);
      return null;
    }
    return session;
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

    // Try JSON (Polygon geometry or GeoJSON Feature)
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

    // Parse lines of "lat, lng"
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) {
      throw new Error('Minimal masukkan 3 titik koordinat (format: lat, lng per baris).');
    }

    const ring = lines.map((line, idx) => {
      const parts = line.split(/[,\s;]+/).filter(Boolean).map(Number);
      if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
        throw new Error(`Format koordinat tidak valid pada baris ke-${idx + 1}. Gunakan format: -6.5450, 107.7210`);
      }
      // GeoJSON order is [lng, lat]
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
  // SHARED IMPORT / EXPORT / DATABASE BACKUP & TOAST
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
        throw new Error('Belum ada data persil spasial di database. Import GeoJSON/Shapefile atau tambah persil manual terlebih dahulu sebelum update Excel berdasarkan ID.');
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

        updatedCount++;
      });

      if (updatedCount === 0) {
        throw new Error(`Tidak ada ID Bidang yang cocok dengan database aktif (${unmatchedCount} baris tidak ditemukan).`);
      }

      return {
        mode: 'update',
        sourceLabel: 'Excel (.xlsx)',
        parcels: clonedParcels,
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
      `landacq_database_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  async function importDatabaseBackupJson(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const t = parsed && parsed.tables;
    if (!t || !Array.isArray(t.admins) || !Array.isArray(t.users) || !Array.isArray(t.parcels)) {
      throw new Error('Format file backup database tidak valid (harus memiliki tables.admins, tables.users, tables.parcels).');
    }
    saveAdmins(t.admins);
    saveUsers(t.users);
    saveParcels(t.parcels);
    if (Array.isArray(t.row_features)) saveRowFeatures(t.row_features);
    if (t.project_settings) saveProjectConfig(t.project_settings);
    if (Array.isArray(t.audit_logs)) writeStorageJson(STORAGE_KEYS.logs, t.audit_logs);
    return t;
  }

  function clearOperationalTables(includeAccounts = false) {
    saveParcels([]);
    saveRowFeatures([]);
    clearLogs();
    if (includeAccounts) {
      saveAdmins([]);
      saveUsers([]);
      saveProjectConfig(getDefaultProjectConfig());
      clearSession();
    }
  }

  window.LANDACQ = {
    STATUS_CONFIG,
    STATUS_ORDER,
    RBAC_ROLES,
    initDb,
    getDefaultProjectConfig,
    loadAdmins,
    saveAdmins,
    loadUsers,
    saveUsers,
    loadParcels,
    saveParcels,
    loadRowFeatures,
    saveRowFeatures,
    loadProjectConfig,
    saveProjectConfig,
    loadLogs,
    pushLog,
    clearLogs,
    isIdentifierTaken,
    createAdminRecord,
    createUserRecord,
    authenticateAccount,
    loadSession,
    saveSession,
    clearSession,
    requireAuth,
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
