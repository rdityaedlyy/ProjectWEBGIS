(() => {
  'use strict';

  const LStore = window.LANDACQ;
  const session = LStore.requireAuth('admin.html');
  if (!session) return;

  const {
    STATUS_CONFIG,
    RBAC_ROLES,
    formatNumberID,
    formatCurrencyIDR,
    formatCompactIDR,
    escapeHtml
  } = LStore;

  const state = {
    session,
    role: session.role || 'viewer',
    originRole: session.originRole || session.role || 'viewer',
    admins: [],
    users: [],
    parcels: [],
    rowFeatures: [],
    project: LStore.loadProjectConfig(),
    logs: [],
    activeTab: 'accounts',
    selectedParcelIds: new Set(),
    editingAdminId: null,
    editingUserId: null,
    editingParcelId: null,
    filters: {
      adminSearch: '',
      userSearch: '',
      userRole: 'ALL',
      parcelSearch: '',
      parcelStatus: 'ALL',
      parcelDesa: 'ALL'
    }
  };

  const el = {
    adminProjectSub: document.getElementById('adminProjectSub'),
    headerUserName: document.getElementById('headerUserName'),
    roleSelect: document.getElementById('roleSelect'),
    roleDot: document.getElementById('roleDot'),
    btnLogout: document.getElementById('btnLogout'),
    rbacGuard: document.getElementById('rbacGuard'),
    guardRoleName: document.getElementById('guardRoleName'),
    adminWorkspace: document.getElementById('adminWorkspace'),

    tabAccountCount: document.getElementById('tabAccountCount'),
    tabParcelCount: document.getElementById('tabParcelCount'),
    tabLogCount: document.getElementById('tabLogCount'),

    admKpiAdmins: document.getElementById('admKpiAdmins'),
    admKpiAdminsActive: document.getElementById('admKpiAdminsActive'),
    admKpiUsers: document.getElementById('admKpiUsers'),
    admKpiUsersBreakdown: document.getElementById('admKpiUsersBreakdown'),
    admKpiTotal: document.getElementById('admKpiTotal'),
    admKpiLuasSub: document.getElementById('admKpiLuasSub'),
    admKpiUgr: document.getElementById('admKpiUgr'),
    admKpiBebasSub: document.getElementById('admKpiBebasSub'),

    badgeAdminsCount: document.getElementById('badgeAdminsCount'),
    admSearchAdmin: document.getElementById('admSearchAdmin'),
    btnAddAdmin: document.getElementById('btnAddAdmin'),
    admAdminTableBody: document.getElementById('admAdminTableBody'),

    badgeUsersCount: document.getElementById('badgeUsersCount'),
    admSearchUser: document.getElementById('admSearchUser'),
    admFilterUserRole: document.getElementById('admFilterUserRole'),
    btnAddUser: document.getElementById('btnAddUser'),
    admUserTableBody: document.getElementById('admUserTableBody'),

    admSearchParcel: document.getElementById('admSearchParcel'),
    admFilterStatus: document.getElementById('admFilterStatus'),
    admFilterDesa: document.getElementById('admFilterDesa'),
    btnAddParcel: document.getElementById('btnAddParcel'),
    bulkBar: document.getElementById('bulkBar'),
    bulkSelectedCount: document.getElementById('bulkSelectedCount'),
    bulkStatusSelect: document.getElementById('bulkStatusSelect'),
    btnBulkApplyStatus: document.getElementById('btnBulkApplyStatus'),
    btnBulkDelete: document.getElementById('btnBulkDelete'),
    chkAllParcels: document.getElementById('chkAllParcels'),
    admParcelTableBody: document.getElementById('admParcelTableBody'),

    projectConfigForm: document.getElementById('projectConfigForm'),
    cfgName: document.getElementById('cfgName'),
    cfgCode: document.getElementById('cfgCode'),
    cfgRowWidth: document.getElementById('cfgRowWidth'),
    cfgRegion: document.getElementById('cfgRegion'),
    cfgTargetDate: document.getElementById('cfgTargetDate'),
    cfgCenterLat: document.getElementById('cfgCenterLat'),
    cfgCenterLng: document.getElementById('cfgCenterLng'),

    admImportDropzone: document.getElementById('admImportDropzone'),
    admImportFileInput: document.getElementById('admImportFileInput'),
    admImportFeedback: document.getElementById('admImportFeedback'),
    admRowCountLabel: document.getElementById('admRowCountLabel'),
    admBtnImportRow: document.getElementById('admBtnImportRow'),
    admBtnClearRow: document.getElementById('admBtnClearRow'),
    admRowFileInput: document.getElementById('admRowFileInput'),
    admBtnExportGeojson: document.getElementById('admBtnExportGeojson'),
    admBtnExportExcel: document.getElementById('admBtnExportExcel'),
    admBtnTemplateXlsx: document.getElementById('admBtnTemplateXlsx'),
    admBtnBackupDb: document.getElementById('admBtnBackupDb'),
    admBtnRestoreDb: document.getElementById('admBtnRestoreDb'),
    admBtnClearData: document.getElementById('admBtnClearData'),
    admRestoreFileInput: document.getElementById('admRestoreFileInput'),

    btnClearLogs: document.getElementById('btnClearLogs'),
    admLogTableBody: document.getElementById('admLogTableBody'),

    adminModal: document.getElementById('adminModal'),
    adminModalTitle: document.getElementById('adminModalTitle'),
    btnCloseAdminModal: document.getElementById('btnCloseAdminModal'),
    btnCancelAdminModal: document.getElementById('btnCancelAdminModal'),
    adminForm: document.getElementById('adminForm'),
    amName: document.getElementById('amName'),
    amUsername: document.getElementById('amUsername'),
    amEmail: document.getElementById('amEmail'),
    amJabatan: document.getElementById('amJabatan'),
    amPassword: document.getElementById('amPassword'),
    amActive: document.getElementById('amActive'),

    userModal: document.getElementById('userModal'),
    userModalTitle: document.getElementById('userModalTitle'),
    btnCloseUserModal: document.getElementById('btnCloseUserModal'),
    btnCancelUserModal: document.getElementById('btnCancelUserModal'),
    userForm: document.getElementById('userForm'),
    umName: document.getElementById('umName'),
    umUsername: document.getElementById('umUsername'),
    umEmail: document.getElementById('umEmail'),
    umUnit: document.getElementById('umUnit'),
    umRole: document.getElementById('umRole'),
    umPassword: document.getElementById('umPassword'),
    umActive: document.getElementById('umActive'),

    parcelModal: document.getElementById('parcelModal'),
    parcelModalTitle: document.getElementById('parcelModalTitle'),
    btnCloseParcelModal: document.getElementById('btnCloseParcelModal'),
    btnCancelParcelModal: document.getElementById('btnCancelParcelModal'),
    parcelForm: document.getElementById('parcelForm'),
    pmId: document.getElementById('pmId'),
    pmDesa: document.getElementById('pmDesa'),
    pmPemilik: document.getElementById('pmPemilik'),
    pmLuas: document.getElementById('pmLuas'),
    pmUgr: document.getElementById('pmUgr'),
    pmStatus: document.getElementById('pmStatus'),
    pmProgres: document.getElementById('pmProgres'),
    btnGenRectPoly: document.getElementById('btnGenRectPoly'),
    rectHelperBox: document.getElementById('rectHelperBox'),
    rhLat: document.getElementById('rhLat'),
    rhLng: document.getElementById('rhLng'),
    rhW: document.getElementById('rhW'),
    rhH: document.getElementById('rhH'),
    btnApplyRectPoly: document.getElementById('btnApplyRectPoly'),
    pmCoords: document.getElementById('pmCoords'),
    pmCatatan: document.getElementById('pmCatatan'),

    toastStack: document.getElementById('toastStack')
  };

  function showToast(msg, type = 'info') {
    LStore.showToast(el.toastStack, msg, type);
  }

  async function logAction(text, tableName = 'database') {
    state.logs = await LStore.pushLog(state.session.name, tableName, 'Kelola', text);
    renderLogsTable();
    renderSummaryKpis();
  }

  function formatShortDate(iso) {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('id-ID');
    } catch (_e) {
      return '-';
    }
  }

  // =========================================================================
  // RBAC GUARD & HEADER SYNC
  // =========================================================================
  function applyRbacGuard() {
    const perm = RBAC_ROLES[state.role];
    el.roleSelect.value = state.role;
    el.roleSelect.disabled = state.originRole !== 'admin';
    el.roleDot.style.background = perm.color;
    el.headerUserName.textContent = state.session.name;
    el.adminProjectSub.textContent = `Konsol Database Manual — ${state.project.name} (${state.project.code})`;

    if (perm.canAccessAdmin) {
      el.rbacGuard.classList.remove('show');
      el.adminWorkspace.style.display = 'flex';
    } else {
      el.guardRoleName.textContent = perm.label;
      el.rbacGuard.classList.add('show');
      el.adminWorkspace.style.display = 'none';
    }
  }

  // =========================================================================
  // KPI & SUMMARY COUNTS
  // =========================================================================
  function renderSummaryKpis() {
    const activeAdmins = state.admins.filter(a => a.is_active !== false).length;
    const surveyors = state.users.filter(u => u.role === 'surveyor').length;
    const viewers = state.users.filter(u => u.role === 'viewer').length;

    const totalLuas = state.parcels.reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
    const totalUgr = state.parcels.reduce((s, f) => s + (Number(f.properties.nilai_ugr) || 0), 0);
    const bebasLuas = state.parcels
      .filter(f => f.properties.status === 'Bebas/Lunas')
      .reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
    const bebasPct = totalLuas > 0 ? (bebasLuas / totalLuas) * 100 : 0;

    el.admKpiAdmins.textContent = formatNumberID(state.admins.length);
    el.admKpiAdminsActive.textContent = `${activeAdmins} admin aktif`;

    el.admKpiUsers.textContent = formatNumberID(state.users.length);
    el.admKpiUsersBreakdown.textContent = `${surveyors} surveyor • ${viewers} viewer`;

    el.admKpiTotal.textContent = formatNumberID(state.parcels.length);
    el.admKpiLuasSub.textContent = `${formatNumberID(totalLuas)} m² (${formatNumberID(totalLuas / 10000, 2)} Ha)`;

    el.admKpiUgr.textContent = formatCompactIDR(totalUgr);
    el.admKpiBebasSub.textContent = `${formatNumberID(bebasPct, 1)}% terbebaskan`;

    el.tabAccountCount.textContent = state.admins.length + state.users.length;
    el.tabParcelCount.textContent = state.parcels.length;
    el.tabLogCount.textContent = state.logs.length;
  }

  // =========================================================================
  // TAB 1A: TABEL ADMINS
  // =========================================================================
  function renderAdminTable() {
    const q = state.filters.adminSearch.trim().toLowerCase();
    const list = state.admins.filter(a =>
      !q || `${a.id} ${a.nama_lengkap} ${a.username} ${a.email} ${a.jabatan}`.toLowerCase().includes(q)
    );

    el.badgeAdminsCount.textContent = `${list.length} BARIS`;

    if (!list.length) {
      el.admAdminTableBody.innerHTML = `
        <tr><td colspan="8" style="text-align:center; padding: 18px; color: var(--text-muted);">Belum ada data pada tabel <span class="mono">admins</span>.</td></tr>
      `;
      return;
    }

    el.admAdminTableBody.innerHTML = list.map(a => {
      const isActive = a.is_active !== false;
      const isSelf = a.id === state.session.accountId;
      return `
        <tr>
          <td class="mono" style="color:#34d399; font-weight:700;">${escapeHtml(a.id)}</td>
          <td>${escapeHtml(a.nama_lengkap)} ${isSelf ? '<span class="brand-tag" style="margin-left:4px;">Anda</span>' : ''}</td>
          <td class="mono">${escapeHtml(a.username)}</td>
          <td class="mono" style="color:var(--text-secondary);">${escapeHtml(a.email)}</td>
          <td>${escapeHtml(a.jabatan || '-')}</td>
          <td>${isActive ? '<span class="status-badge st-bebas">Aktif</span>' : '<span class="status-badge st-sengketa">Nonaktif</span>'}</td>
          <td class="mono" style="color:var(--text-muted);">${escapeHtml(formatShortDate(a.created_at))}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 5px;">
              <button type="button" class="btn btn-primary btn-sm btn-edit-admin" data-id="${escapeHtml(a.id)}" style="height:24px;">Edit</button>
              <button type="button" class="btn btn-sm btn-toggle-admin" data-id="${escapeHtml(a.id)}" style="height:24px;">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button type="button" class="btn btn-danger btn-sm btn-del-admin" data-id="${escapeHtml(a.id)}" style="height:24px;">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openAdminModal(adminId = null) {
    state.editingAdminId = adminId;
    if (adminId) {
      const a = state.admins.find(item => item.id === adminId);
      if (!a) return;
      el.adminModalTitle.innerHTML = `<i data-lucide="shield" width="15" height="15" style="color: var(--st-bebas);"></i> Edit Admin ${escapeHtml(a.id)}`;
      el.amName.value = a.nama_lengkap;
      el.amUsername.value = a.username;
      el.amEmail.value = a.email;
      el.amJabatan.value = a.jabatan || '';
      el.amPassword.value = a.password;
      el.amActive.checked = a.is_active !== false;
    } else {
      el.adminModalTitle.innerHTML = `<i data-lucide="shield-plus" width="15" height="15" style="color: var(--st-bebas);"></i> Tambah Admin Baru`;
      el.amName.value = '';
      el.amUsername.value = '';
      el.amEmail.value = '';
      el.amJabatan.value = 'Koordinator Pengadaan Tanah';
      el.amPassword.value = '';
      el.amActive.checked = true;
    }
    el.adminModal.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function saveAdminFromModal(e) {
    e.preventDefault();
    const nama_lengkap = el.amName.value.trim();
    const username = el.amUsername.value.trim();
    const email = el.amEmail.value.trim();
    const jabatan = el.amJabatan.value.trim() || 'Koordinator Pengadaan Tanah';
    const password = el.amPassword.value;
    const is_active = el.amActive.checked;

    if (LStore.isIdentifierTaken(username, email, state.editingAdminId)) {
      showToast('Username atau email sudah digunakan oleh akun lain.', 'error');
      return;
    }

    try {
      if (state.editingAdminId) {
        const idx = state.admins.findIndex(a => a.id === state.editingAdminId);
        if (idx === -1) return;
        const otherActiveAdmins = state.admins.filter((a, i) => i !== idx && a.is_active !== false);
        if (!is_active && otherActiveAdmins.length === 0) {
          showToast('Minimal harus ada 1 akun Admin aktif di tabel admins.', 'error');
          return;
        }
        await LStore.updateAdminRecord(state.editingAdminId, {
          nama_lengkap,
          username,
          email,
          jabatan,
          password,
          is_active
        });
        state.admins = LStore.loadAdmins();
        await logAction(`Edit data admin ${state.editingAdminId} (${username}).`, 'admins');
        showToast(`Data admin ${nama_lengkap} diperbarui di Supabase.`, 'success');
      } else {
        const created = await LStore.createAdminRecord({
          nama_lengkap,
          username,
          email,
          password,
          jabatan,
          is_active
        });
        state.admins = LStore.loadAdmins();
        await logAction(`Tambah admin baru ${created.id} (${username}) ke tabel admins.`, 'admins');
        showToast(`Admin ${nama_lengkap} ditambahkan ke tabel admins Supabase.`, 'success');
      }

      el.adminModal.classList.remove('open');
      renderSummaryKpis();
      renderAdminTable();
    } catch (err) {
      showToast(`Gagal menyimpan admin: ${err.message}`, 'error');
    }
  }

  // =========================================================================
  // TAB 1B: TABEL USERS (SURVEYOR & VIEWER)
  // =========================================================================
  function renderUserTable() {
    const q = state.filters.userSearch.trim().toLowerCase();
    const roleFilter = state.filters.userRole;
    const list = state.users.filter(u => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (q && !`${u.id} ${u.nama_lengkap} ${u.username} ${u.email} ${u.unit_kerja}`.toLowerCase().includes(q)) return false;
      return true;
    });

    el.badgeUsersCount.textContent = `${list.length} BARIS`;

    if (!list.length) {
      el.admUserTableBody.innerHTML = `
        <tr><td colspan="9" style="text-align:center; padding: 18px; color: var(--text-muted);">Belum ada data pada tabel <span class="mono">users</span>. Klik "Tambah User" untuk menambahkan Surveyor atau Viewer.</td></tr>
      `;
      return;
    }

    el.admUserTableBody.innerHTML = list.map(u => {
      const roleMeta = RBAC_ROLES[u.role] || RBAC_ROLES.viewer;
      const isActive = u.is_active !== false;
      return `
        <tr>
          <td class="mono" style="color:#67e8f9; font-weight:700;">${escapeHtml(u.id)}</td>
          <td>${escapeHtml(u.nama_lengkap)}</td>
          <td class="mono">${escapeHtml(u.username)}</td>
          <td class="mono" style="color:var(--text-secondary);">${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.unit_kerja || '-')}</td>
          <td>
            <span class="status-badge" style="border-color:${roleMeta.color}; color:${roleMeta.color}; background: rgba(15,23,42,0.75);">
              ${escapeHtml(roleMeta.label)}
            </span>
          </td>
          <td>${isActive ? '<span class="status-badge st-bebas">Aktif</span>' : '<span class="status-badge st-sengketa">Nonaktif</span>'}</td>
          <td class="mono" style="color:var(--text-muted);">${escapeHtml(formatShortDate(u.created_at))}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 5px;">
              <button type="button" class="btn btn-primary btn-sm btn-edit-user" data-id="${escapeHtml(u.id)}" style="height:24px;">Edit</button>
              <button type="button" class="btn btn-sm btn-toggle-user" data-id="${escapeHtml(u.id)}" style="height:24px;">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button type="button" class="btn btn-danger btn-sm btn-del-user" data-id="${escapeHtml(u.id)}" style="height:24px;">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openUserModal(userId = null) {
    state.editingUserId = userId;
    if (userId) {
      const u = state.users.find(item => item.id === userId);
      if (!u) return;
      el.userModalTitle.innerHTML = `<i data-lucide="user-cog" width="15" height="15" style="color: var(--st-bayar);"></i> Edit User ${escapeHtml(u.id)}`;
      el.umName.value = u.nama_lengkap;
      el.umUsername.value = u.username;
      el.umEmail.value = u.email;
      el.umUnit.value = u.unit_kerja || '';
      el.umRole.value = u.role === 'viewer' ? 'viewer' : 'surveyor';
      el.umPassword.value = u.password;
      el.umActive.checked = u.is_active !== false;
    } else {
      el.userModalTitle.innerHTML = `<i data-lucide="user-plus" width="15" height="15" style="color: var(--st-bayar);"></i> Tambah User Baru`;
      el.umName.value = '';
      el.umUsername.value = '';
      el.umEmail.value = '';
      el.umUnit.value = 'Tim Lapangan';
      el.umRole.value = 'surveyor';
      el.umPassword.value = '';
      el.umActive.checked = true;
    }
    el.userModal.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function saveUserFromModal(e) {
    e.preventDefault();
    const nama_lengkap = el.umName.value.trim();
    const username = el.umUsername.value.trim();
    const email = el.umEmail.value.trim();
    const unit_kerja = el.umUnit.value.trim() || 'Tim Lapangan';
    const role = el.umRole.value === 'viewer' ? 'viewer' : 'surveyor';
    const password = el.umPassword.value;
    const is_active = el.umActive.checked;

    if (LStore.isIdentifierTaken(username, email, state.editingUserId)) {
      showToast('Username atau email sudah digunakan oleh akun lain.', 'error');
      return;
    }

    try {
      if (state.editingUserId) {
        const idx = state.users.findIndex(u => u.id === state.editingUserId);
        if (idx === -1) return;
        await LStore.updateUserRecord(state.editingUserId, {
          nama_lengkap,
          username,
          email,
          unit_kerja,
          role,
          password,
          is_active
        });
        state.users = LStore.loadUsers();
        await logAction(`Edit data user ${state.editingUserId} (${username} • ${role}).`, 'users');
        showToast(`Data user ${nama_lengkap} diperbarui di Supabase.`, 'success');
      } else {
        const created = await LStore.createUserRecord({
          nama_lengkap,
          username,
          email,
          password,
          role,
          unit_kerja,
          is_active,
          created_by_admin_id: state.session.accountId
        });
        state.users = LStore.loadUsers();
        await logAction(`Tambah user baru ${created.id} (${username} • ${role}) ke tabel users.`, 'users');
        showToast(`User ${nama_lengkap} ditambahkan ke tabel users Supabase.`, 'success');
      }

      el.userModal.classList.remove('open');
      renderSummaryKpis();
      renderUserTable();
    } catch (err) {
      showToast(`Gagal menyimpan user: ${err.message}`, 'error');
    }
  }

  // =========================================================================
  // TAB 2: PARCELS CRUD & MANUAL POLYGON ENTRY
  // =========================================================================
  function refreshDesaFilterOptions() {
    const uniqueDesa = Array.from(new Set(state.parcels.map(f => f.properties.desa))).sort((a, b) => a.localeCompare(b, 'id'));
    const prev = state.filters.parcelDesa;
    el.admFilterDesa.innerHTML = '<option value="ALL">Semua Wilayah</option>' +
      uniqueDesa.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    el.admFilterDesa.value = uniqueDesa.includes(prev) ? prev : 'ALL';
    state.filters.parcelDesa = el.admFilterDesa.value;
  }

  function getFilteredParcels() {
    const q = state.filters.parcelSearch.trim().toLowerCase();
    return state.parcels.filter(f => {
      const p = f.properties;
      if (state.filters.parcelStatus !== 'ALL' && p.status !== state.filters.parcelStatus) return false;
      if (state.filters.parcelDesa !== 'ALL' && p.desa !== state.filters.parcelDesa) return false;
      if (q && !`${p.id_bidang} ${p.nama_pemilik} ${p.desa}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function syncBulkBar() {
    const count = state.selectedParcelIds.size;
    el.bulkSelectedCount.textContent = count;
    el.bulkBar.classList.toggle('show', count > 0);
  }

  function renderParcelTable() {
    const list = getFilteredParcels();
    el.chkAllParcels.checked = list.length > 0 && list.every(f => state.selectedParcelIds.has(f.properties.id_bidang));

    if (!list.length) {
      const emptyText = state.parcels.length === 0
        ? 'Tabel <span class="mono">parcels</span> masih kosong (tanpa data dummy). Klik <strong>Tambah Persil Manual</strong> atau import GeoJSON/SHP.'
        : 'Tidak ada data persil yang sesuai dengan filter.';
      el.admParcelTableBody.innerHTML = `
        <tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">${emptyText}</td></tr>
      `;
      syncBulkBar();
      return;
    }

    el.admParcelTableBody.innerHTML = list.map(f => {
      const p = f.properties;
      const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['Belum Diproses'];
      const checked = state.selectedParcelIds.has(p.id_bidang) ? 'checked' : '';
      return `
        <tr data-id="${escapeHtml(p.id_bidang)}">
          <td style="text-align: center;">
            <input type="checkbox" class="chk-parcel-row" data-id="${escapeHtml(p.id_bidang)}" ${checked} />
          </td>
          <td class="mono" style="font-weight: 700; color: #67e8f9;">${escapeHtml(p.id_bidang)}</td>
          <td>${escapeHtml(p.nama_pemilik)}</td>
          <td style="color: var(--text-secondary);">${escapeHtml(p.desa)}</td>
          <td class="mono">${formatNumberID(p.luas_m2)}</td>
          <td class="mono">${formatCurrencyIDR(p.nilai_ugr)}</td>
          <td>
            <span class="status-badge ${cfg.badgeClass}">
              <span class="swatch" style="background:${cfg.color}; width:6px; height:6px;"></span>
              ${escapeHtml(p.status)}
            </span>
          </td>
          <td class="mono">${p.progres}%</td>
          <td style="color: var(--text-secondary);" title="${escapeHtml(p.catatan)}">${escapeHtml(p.catatan)}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 5px;">
              <a href="peta.html?focus=${encodeURIComponent(p.id_bidang)}" class="btn btn-sm" style="text-decoration:none; height:24px;" title="Lihat di Peta">Peta</a>
              <button type="button" class="btn btn-primary btn-sm btn-edit-parcel" data-id="${escapeHtml(p.id_bidang)}" style="height:24px;">Edit</button>
              <button type="button" class="btn btn-danger btn-sm btn-del-parcel" data-id="${escapeHtml(p.id_bidang)}" style="height:24px;">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    syncBulkBar();
  }

  function geometryToLatLngText(geometry) {
    if (!geometry) return '';
    if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
      const ring = geometry.coordinates[0];
      const len = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring.length - 1
        : ring.length;
      return ring.slice(0, len).map(pt => `${pt[1]}, ${pt[0]}`).join('\n');
    }
    return JSON.stringify(geometry);
  }

  function openParcelModal(parcelId = null) {
    state.editingParcelId = parcelId;
    el.rectHelperBox.style.display = 'none';
    el.rhLat.value = state.project.centerLat ?? -6.5458;
    el.rhLng.value = state.project.centerLng ?? 107.7232;

    if (parcelId) {
      const feat = state.parcels.find(f => f.properties.id_bidang === parcelId);
      if (!feat) return;
      const p = feat.properties;
      el.parcelModalTitle.innerHTML = `<i data-lucide="pencil" width="15" height="15" style="color: var(--accent-cyan);"></i> Edit Persil ${escapeHtml(p.id_bidang)}`;
      el.pmId.value = p.id_bidang;
      el.pmId.disabled = true;
      el.pmDesa.value = p.desa;
      el.pmPemilik.value = p.nama_pemilik;
      el.pmLuas.value = p.luas_m2;
      el.pmUgr.value = p.nilai_ugr;
      el.pmStatus.value = p.status;
      el.pmProgres.value = p.progres;
      el.pmCoords.value = geometryToLatLngText(feat.geometry);
      el.pmCatatan.value = p.catatan;
    } else {
      el.parcelModalTitle.innerHTML = `<i data-lucide="map-pin-plus" width="15" height="15" style="color: var(--st-bebas);"></i> Tambah Persil Manual`;
      el.pmId.value = `PRS-${String(state.parcels.length + 1).padStart(3, '0')}`;
      el.pmId.disabled = false;
      el.pmDesa.value = '';
      el.pmPemilik.value = '';
      el.pmLuas.value = '';
      el.pmUgr.value = 0;
      el.pmStatus.value = 'Belum Diproses';
      el.pmProgres.value = 0;
      el.pmCoords.value = '';
      el.pmCatatan.value = '';
    }
    el.parcelModal.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function saveParcelFromModal(e) {
    e.preventDefault();
    let geometry;
    try {
      geometry = LStore.parseManualPolygonInput(el.pmCoords.value);
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }

    const idVal = el.pmId.value.trim();
    const desa = el.pmDesa.value.trim();
    const pemilik = el.pmPemilik.value.trim();
    const computedArea = Math.max(1, Math.round(LStore.computeGeometryAreaSqm(geometry)));
    const luas = parseInt(el.pmLuas.value, 10) || computedArea;
    const ugr = Math.max(0, parseInt(el.pmUgr.value, 10) || 0);
    const status = el.pmStatus.value;
    const progres = Math.max(0, Math.min(100, parseInt(el.pmProgres.value, 10) || 0));
    const catatan = el.pmCatatan.value.trim() || '-';

    try {
      if (state.editingParcelId) {
        const existing = state.parcels.find(f => f.properties.id_bidang === state.editingParcelId);
        if (!existing) return;
        const updatedFeat = {
          type: 'Feature',
          geometry,
          properties: {
            ...existing.properties,
            desa,
            nama_pemilik: pemilik,
            luas_m2: luas,
            nilai_ugr: ugr,
            status,
            progres,
            catatan
          }
        };
        await LStore.upsertParcel(updatedFeat, state.session.accountId);
        state.parcels = LStore.loadParcels();
        await logAction(`Edit persil ${existing.properties.id_bidang} (${status}).`, 'parcels');
        showToast(`Persil ${existing.properties.id_bidang} berhasil diperbarui di Supabase.`, 'success');
      } else {
        if (state.parcels.some(f => f.properties.id_bidang.toUpperCase() === idVal.toUpperCase())) {
          showToast(`ID Bidang ${idVal} sudah terdaftar di tabel parcels.`, 'error');
          return;
        }
        const newFeat = {
          type: 'Feature',
          geometry,
          properties: {
            id_bidang: idVal,
            nama_pemilik: pemilik,
            desa,
            luas_m2: luas,
            nilai_ugr: ugr,
            status,
            progres,
            catatan
          }
        };
        await LStore.upsertParcel(newFeat, state.session.accountId);
        state.parcels = LStore.loadParcels();
        await logAction(`Tambah persil manual ${idVal} (${pemilik}).`, 'parcels');
        showToast(`Persil ${idVal} disimpan ke tabel parcels Supabase.`, 'success');
      }

      el.parcelModal.classList.remove('open');
      refreshDesaFilterOptions();
      renderSummaryKpis();
      renderParcelTable();
    } catch (err) {
      showToast(`Gagal menyimpan persil: ${err.message}`, 'error');
    }
  }

  // =========================================================================
  // TAB 3: PROJECT, IMPORT/EXPORT & DATABASE TOOLS
  // =========================================================================
  function renderProjectForm() {
    el.cfgName.value = state.project.name || '';
    el.cfgCode.value = state.project.code || '';
    el.cfgRowWidth.value = state.project.rowWidth || 90;
    el.cfgRegion.value = state.project.region || '';
    el.cfgTargetDate.value = state.project.targetDate || '';
    el.cfgCenterLat.value = state.project.centerLat ?? -6.5458;
    el.cfgCenterLng.value = state.project.centerLng ?? 107.7232;
    el.admRowCountLabel.textContent = `${state.rowFeatures.length} fitur`;
  }

  async function handleAdminImportFile(file) {
    if (!file) return;
    try {
      const result = await LStore.parseUploadedDatasetFile(file, state.parcels);
      if (result.mode === 'replace') {
        state.parcels = await LStore.replaceAllParcels(result.parcels, state.session.accountId);
      } else {
        state.parcels = await LStore.upsertManyParcels(result.parcels, state.session.accountId);
      }
      state.selectedParcelIds.clear();
      refreshDesaFilterOptions();
      renderSummaryKpis();
      renderParcelTable();

      const msg = result.mode === 'replace'
        ? `Import ${escapeHtml(result.sourceLabel)} berhasil: ${result.parcels.length} persil dimuat ke tabel parcels Supabase.`
        : `Import Excel berhasil: ${result.updatedCount} persil diperbarui di Supabase.`;
      el.admImportFeedback.style.display = 'block';
      el.admImportFeedback.style.borderColor = 'var(--st-bebas)';
      el.admImportFeedback.innerHTML = `<strong style="color:#34d399;">${msg}</strong>`;
      showToast(msg, 'success');
      await logAction(msg, 'parcels');
    } catch (err) {
      el.admImportFeedback.style.display = 'block';
      el.admImportFeedback.style.borderColor = 'var(--st-sengketa)';
      el.admImportFeedback.innerHTML = `<strong style="color:#f87171;">Gagal:</strong> ${escapeHtml(err.message)}`;
      showToast(err.message, 'error');
    } finally {
      el.admImportFileInput.value = '';
    }
  }

  // =========================================================================
  // TAB 4: LOG AUDIT
  // =========================================================================
  function renderLogsTable() {
    el.tabLogCount.textContent = state.logs.length;
    if (!state.logs.length) {
      el.admLogTableBody.innerHTML = `
        <tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">Belum ada riwayat log aktivitas.</td></tr>
      `;
      return;
    }
    el.admLogTableBody.innerHTML = state.logs.map(item => `
      <tr>
        <td class="mono" style="color:var(--text-secondary);">${escapeHtml(item.date || '-')}</td>
        <td class="mono">${escapeHtml(item.time)}</td>
        <td style="color:#67e8f9; font-weight:600;">${escapeHtml(item.actor)}</td>
        <td class="mono" style="color:var(--text-secondary);">${escapeHtml(item.accountType || '-')}</td>
        <td><span class="brand-tag">${escapeHtml(item.page || 'App')}</span></td>
        <td>${escapeHtml(item.text)}</td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      state.activeTab = target;
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('panelAccounts').classList.toggle('active', target === 'accounts');
      document.getElementById('panelParcels').classList.toggle('active', target === 'parcels');
      document.getElementById('panelProject').classList.toggle('active', target === 'project');
      document.getElementById('panelLogs').classList.toggle('active', target === 'logs');
    });
  });

  el.roleSelect.addEventListener('change', () => {
    if (state.originRole !== 'admin') return;
    state.role = el.roleSelect.value;
    state.session.role = state.role;
    LStore.saveSession(state.session);
    applyRbacGuard();
    showToast(`Mode pratinjau role diubah ke: ${RBAC_ROLES[state.role].label}`, 'info');
  });

  el.btnLogout.addEventListener('click', async () => {
    try {
      await LStore.pushLog(state.session.name, state.session.table || 'admins', 'Kelola', 'Keluar dari Konsol Admin.');
    } catch (_err) {}
    LStore.clearSession();
    window.location.href = 'index.html';
  });

  // Admins table filters & actions
  el.admSearchAdmin.addEventListener('input', () => {
    state.filters.adminSearch = el.admSearchAdmin.value;
    renderAdminTable();
  });
  el.btnAddAdmin.addEventListener('click', () => openAdminModal(null));
  el.btnCloseAdminModal.addEventListener('click', () => el.adminModal.classList.remove('open'));
  el.btnCancelAdminModal.addEventListener('click', () => el.adminModal.classList.remove('open'));
  el.adminForm.addEventListener('submit', saveAdminFromModal);

  el.admAdminTableBody.addEventListener('click', async e => {
    const editBtn = e.target.closest('.btn-edit-admin');
    if (editBtn) {
      openAdminModal(editBtn.getAttribute('data-id'));
      return;
    }

    const toggleBtn = e.target.closest('.btn-toggle-admin');
    if (toggleBtn) {
      const aid = toggleBtn.getAttribute('data-id');
      const target = state.admins.find(a => a.id === aid);
      if (!target) return;
      const nextActive = target.is_active === false;
      const otherActive = state.admins.filter(a => a.id !== aid && a.is_active !== false);
      if (!nextActive && otherActive.length === 0) {
        showToast('Minimal harus tersisa 1 Admin aktif di tabel admins.', 'error');
        return;
      }
      try {
        await LStore.updateAdminRecord(aid, { is_active: nextActive });
        state.admins = LStore.loadAdmins();
        renderSummaryKpis();
        renderAdminTable();
        await logAction(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} admin ${target.username}.`, 'admins');
      } catch (err) {
        showToast(`Gagal memperbarui status admin: ${err.message}`, 'error');
      }
      return;
    }

    const delBtn = e.target.closest('.btn-del-admin');
    if (delBtn) {
      const aid = delBtn.getAttribute('data-id');
      const target = state.admins.find(a => a.id === aid);
      if (!target) return;
      const otherActive = state.admins.filter(a => a.id !== aid && a.is_active !== false);
      if (otherActive.length === 0) {
        showToast('Tidak dapat menghapus satu-satunya Admin aktif.', 'error');
        return;
      }
      try {
        state.admins = await LStore.deleteAdminRecord(aid);
        renderSummaryKpis();
        renderAdminTable();
        await logAction(`Hapus admin ${target.username} dari tabel admins.`, 'admins');
        showToast(`Admin ${target.nama_lengkap} dihapus dari Supabase.`, 'warn');
      } catch (err) {
        showToast(`Gagal menghapus admin: ${err.message}`, 'error');
      }
    }
  });

  // Users table filters & actions
  el.admSearchUser.addEventListener('input', () => {
    state.filters.userSearch = el.admSearchUser.value;
    renderUserTable();
  });
  el.admFilterUserRole.addEventListener('change', () => {
    state.filters.userRole = el.admFilterUserRole.value;
    renderUserTable();
  });
  el.btnAddUser.addEventListener('click', () => openUserModal(null));
  el.btnCloseUserModal.addEventListener('click', () => el.userModal.classList.remove('open'));
  el.btnCancelUserModal.addEventListener('click', () => el.userModal.classList.remove('open'));
  el.userForm.addEventListener('submit', saveUserFromModal);

  el.admUserTableBody.addEventListener('click', async e => {
    const editBtn = e.target.closest('.btn-edit-user');
    if (editBtn) {
      openUserModal(editBtn.getAttribute('data-id'));
      return;
    }

    const toggleBtn = e.target.closest('.btn-toggle-user');
    if (toggleBtn) {
      const uid = toggleBtn.getAttribute('data-id');
      const target = state.users.find(u => u.id === uid);
      if (!target) return;
      const nextActive = target.is_active === false;
      try {
        await LStore.updateUserRecord(uid, { is_active: nextActive });
        state.users = LStore.loadUsers();
        renderSummaryKpis();
        renderUserTable();
        await logAction(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} user ${target.username}.`, 'users');
      } catch (err) {
        showToast(`Gagal memperbarui status user: ${err.message}`, 'error');
      }
      return;
    }

    const delBtn = e.target.closest('.btn-del-user');
    if (delBtn) {
      const uid = delBtn.getAttribute('data-id');
      const target = state.users.find(u => u.id === uid);
      if (!target) return;
      try {
        state.users = await LStore.deleteUserRecord(uid);
        renderSummaryKpis();
        renderUserTable();
        await logAction(`Hapus user ${target.username} dari tabel users.`, 'users');
        showToast(`User ${target.nama_lengkap} dihapus dari Supabase.`, 'warn');
      } catch (err) {
        showToast(`Gagal menghapus user: ${err.message}`, 'error');
      }
    }
  });

  // Parcels table filters & actions
  el.admSearchParcel.addEventListener('input', () => {
    state.filters.parcelSearch = el.admSearchParcel.value;
    renderParcelTable();
  });
  el.admFilterStatus.addEventListener('change', () => {
    state.filters.parcelStatus = el.admFilterStatus.value;
    renderParcelTable();
  });
  el.admFilterDesa.addEventListener('change', () => {
    state.filters.parcelDesa = el.admFilterDesa.value;
    renderParcelTable();
  });

  el.chkAllParcels.addEventListener('change', () => {
    const visible = getFilteredParcels();
    if (el.chkAllParcels.checked) {
      visible.forEach(f => state.selectedParcelIds.add(f.properties.id_bidang));
    } else {
      visible.forEach(f => state.selectedParcelIds.delete(f.properties.id_bidang));
    }
    renderParcelTable();
  });

  el.admParcelTableBody.addEventListener('change', e => {
    const chk = e.target.closest('.chk-parcel-row');
    if (!chk) return;
    const id = chk.getAttribute('data-id');
    if (chk.checked) state.selectedParcelIds.add(id);
    else state.selectedParcelIds.delete(id);
    syncBulkBar();
  });

  el.admParcelTableBody.addEventListener('click', async e => {
    const editBtn = e.target.closest('.btn-edit-parcel');
    if (editBtn) {
      openParcelModal(editBtn.getAttribute('data-id'));
      return;
    }
    const delBtn = e.target.closest('.btn-del-parcel');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      try {
        state.parcels = await LStore.deleteParcelsByIds([id]);
        state.selectedParcelIds.delete(id);
        refreshDesaFilterOptions();
        renderSummaryKpis();
        renderParcelTable();
        await logAction(`Hapus persil ${id}.`, 'parcels');
        showToast(`Persil ${id} dihapus dari Supabase.`, 'warn');
      } catch (err) {
        showToast(`Gagal menghapus persil: ${err.message}`, 'error');
      }
    }
  });

  el.btnBulkApplyStatus.addEventListener('click', async () => {
    if (!state.selectedParcelIds.size) return;
    const targetStatus = el.bulkStatusSelect.value;
    let count = 0;
    const nextParcels = state.parcels.map(f => {
      if (!state.selectedParcelIds.has(f.properties.id_bidang)) return f;
      count++;
      return {
        ...f,
        properties: {
          ...f.properties,
          status: targetStatus,
          progres: targetStatus === 'Bebas/Lunas' ? 100 : f.properties.progres
        }
      };
    });
    try {
      state.parcels = await LStore.upsertManyParcels(nextParcels, state.session.accountId);
      state.selectedParcelIds.clear();
      renderSummaryKpis();
      renderParcelTable();
      await logAction(`Bulk update status ${count} persil -> ${targetStatus}.`, 'parcels');
      showToast(`${count} persil diubah menjadi ${targetStatus} di Supabase.`, 'success');
    } catch (err) {
      showToast(`Gagal bulk update: ${err.message}`, 'error');
    }
  });

  el.btnBulkDelete.addEventListener('click', async () => {
    const ids = Array.from(state.selectedParcelIds);
    const count = ids.length;
    if (!count) return;
    try {
      state.parcels = await LStore.deleteParcelsByIds(ids);
      state.selectedParcelIds.clear();
      refreshDesaFilterOptions();
      renderSummaryKpis();
      renderParcelTable();
      await logAction(`Hapus massal ${count} persil terpilih.`, 'parcels');
      showToast(`${count} persil berhasil dihapus dari Supabase.`, 'warn');
    } catch (err) {
      showToast(`Gagal hapus massal: ${err.message}`, 'error');
    }
  });

  // Parcel Modal & Manual Polygon Builder
  el.btnAddParcel.addEventListener('click', () => openParcelModal(null));
  el.btnCloseParcelModal.addEventListener('click', () => el.parcelModal.classList.remove('open'));
  el.btnCancelParcelModal.addEventListener('click', () => el.parcelModal.classList.remove('open'));
  el.parcelForm.addEventListener('submit', saveParcelFromModal);

  el.btnGenRectPoly.addEventListener('click', () => {
    const isHidden = el.rectHelperBox.style.display === 'none';
    el.rectHelperBox.style.display = isHidden ? 'grid' : 'none';
  });

  el.btnApplyRectPoly.addEventListener('click', () => {
    const geom = LStore.buildRectPolygonFromCenter(el.rhLat.value, el.rhLng.value, el.rhW.value, el.rhH.value);
    el.pmCoords.value = geometryToLatLngText(geom);
    const area = Math.round(LStore.computeGeometryAreaSqm(geom));
    el.pmLuas.value = area;
    showToast(`Poligon persegi (${area} m²) diisikan ke koordinat.`, 'info');
  });

  el.pmCoords.addEventListener('blur', () => {
    if (!el.pmLuas.value && el.pmCoords.value.trim()) {
      try {
        const geom = LStore.parseManualPolygonInput(el.pmCoords.value);
        el.pmLuas.value = Math.max(1, Math.round(LStore.computeGeometryAreaSqm(geom)));
      } catch (_e) {
        // validated on submit
      }
    }
  });

  // Project config & spatial/db tools
  el.projectConfigForm.addEventListener('submit', async e => {
    e.preventDefault();
    const nextProject = {
      name: el.cfgName.value.trim(),
      code: el.cfgCode.value.trim(),
      rowWidth: Math.max(10, parseInt(el.cfgRowWidth.value, 10) || 90),
      region: el.cfgRegion.value.trim(),
      targetDate: el.cfgTargetDate.value,
      centerLat: Number(el.cfgCenterLat.value) || -6.5458,
      centerLng: Number(el.cfgCenterLng.value) || 107.7232
    };
    try {
      state.project = await LStore.saveProjectConfig(nextProject);
      applyRbacGuard();
      await logAction(`Update konfigurasi proyek (${state.project.name}).`, 'project_settings');
      showToast('Konfigurasi proyek tersimpan di Supabase.', 'success');
    } catch (err) {
      showToast(`Gagal menyimpan konfigurasi proyek: ${err.message}`, 'error');
    }
  });

  el.admImportDropzone.addEventListener('click', () => el.admImportFileInput.click());
  el.admImportFileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) handleAdminImportFile(e.target.files[0]);
  });
  el.admImportDropzone.addEventListener('dragover', e => {
    e.preventDefault();
    el.admImportDropzone.classList.add('dragover');
  });
  el.admImportDropzone.addEventListener('dragleave', () => el.admImportDropzone.classList.remove('dragover'));
  el.admImportDropzone.addEventListener('drop', e => {
    e.preventDefault();
    el.admImportDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleAdminImportFile(e.dataTransfer.files[0]);
  });

  el.admBtnImportRow.addEventListener('click', () => el.admRowFileInput.click());
  el.admRowFileInput.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const features = await LStore.parseUploadedRowFile(file);
      state.rowFeatures = await LStore.saveRowFeatures(features);
      renderProjectForm();
      await logAction(`Import layer Trase ROW (${features.length} fitur).`, 'project_settings');
      showToast(`Trase ROW tersimpan di Supabase (${features.length} fitur).`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      el.admRowFileInput.value = '';
    }
  });

  el.admBtnClearRow.addEventListener('click', async () => {
    try {
      state.rowFeatures = await LStore.saveRowFeatures([]);
      renderProjectForm();
      await logAction('Hapus layer Trase ROW.', 'project_settings');
      showToast('Layer Trase ROW dikosongkan di Supabase.', 'info');
    } catch (err) {
      showToast(`Gagal mengosongkan ROW: ${err.message}`, 'error');
    }
  });

  el.admBtnExportGeojson.addEventListener('click', () => {
    if (!state.parcels.length) {
      showToast('Tabel parcels masih kosong.', 'warn');
      return;
    }
    LStore.exportFeaturesToGeoJSON(state.parcels, 'all');
    logAction(`Export GeoJSON (${state.parcels.length} persil).`, 'parcels');
    showToast('GeoJSON berhasil diekspor.', 'success');
  });

  el.admBtnExportExcel.addEventListener('click', () => {
    if (!state.parcels.length) {
      showToast('Tabel parcels masih kosong.', 'warn');
      return;
    }
    try {
      LStore.exportFeaturesToExcel(state.parcels, 'Seluruh Dataset', RBAC_ROLES[state.role].label, 'all');
      logAction(`Export Excel (${state.parcels.length} persil).`, 'parcels');
      showToast('Laporan Excel (.xlsx) berhasil diunduh.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  el.admBtnTemplateXlsx.addEventListener('click', () => {
    try {
      LStore.downloadExcelTemplate(state.parcels);
      showToast('Template Excel (.xlsx) berhasil diunduh.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  el.admBtnBackupDb.addEventListener('click', () => {
    LStore.exportDatabaseBackupJson();
    logAction('Export backup seluruh database (.json).', 'database');
    showToast('Backup database JSON berhasil diunduh.', 'success');
  });

  el.admBtnRestoreDb.addEventListener('click', () => el.admRestoreFileInput.click());
  el.admRestoreFileInput.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      await LStore.importDatabaseBackupJson(file);
      state.admins = LStore.loadAdmins();
      state.users = LStore.loadUsers();
      state.parcels = LStore.loadParcels();
      state.rowFeatures = LStore.loadRowFeatures();
      state.project = LStore.loadProjectConfig();
      state.logs = LStore.loadLogs();
      refreshDesaFilterOptions();
      renderSummaryKpis();
      renderAdminTable();
      renderUserTable();
      renderParcelTable();
      renderProjectForm();
      renderLogsTable();
      applyRbacGuard();
      showToast('Database Supabase berhasil direstore dari file backup JSON.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      el.admRestoreFileInput.value = '';
    }
  });

  el.admBtnClearData.addEventListener('click', async () => {
    try {
      await LStore.clearOperationalTables();
      state.parcels = [];
      state.rowFeatures = [];
      state.logs = [];
      state.selectedParcelIds.clear();
      refreshDesaFilterOptions();
      renderSummaryKpis();
      renderParcelTable();
      renderProjectForm();
      renderLogsTable();
      showToast('Tabel parcels, layer ROW, dan log berhasil dikosongkan di Supabase.', 'warn');
    } catch (err) {
      showToast(`Gagal mengosongkan tabel operasional: ${err.message}`, 'error');
    }
  });

  el.btnClearLogs.addEventListener('click', async () => {
    try {
      state.logs = await LStore.clearLogs();
      renderSummaryKpis();
      renderLogsTable();
      showToast('Log audit dibersihkan di Supabase.', 'info');
    } catch (err) {
      showToast(`Gagal membersihkan log audit: ${err.message}`, 'error');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      el.adminModal.classList.remove('open');
      el.userModal.classList.remove('open');
      el.parcelModal.classList.remove('open');
    }
  });

  // =========================================================================
  // INITIALIZE ADMIN CONSOLE
  // =========================================================================
  async function init() {
    const dbOk = await LStore.initDb();
    if (dbOk && !LStore.verifySessionWithDb(state.session, 'admin.html')) {
      return;
    }
    state.admins = LStore.loadAdmins();
    state.users = LStore.loadUsers();
    state.parcels = LStore.loadParcels();
    state.rowFeatures = LStore.loadRowFeatures();
    state.project = LStore.loadProjectConfig();
    state.logs = LStore.loadLogs();

    applyRbacGuard();
    refreshDesaFilterOptions();
    renderSummaryKpis();
    renderAdminTable();
    renderUserTable();
    renderParcelTable();
    renderProjectForm();
    renderLogsTable();

    if (!dbOk) {
      const dbStatus = LStore.getDbStatus();
      showToast(`Gagal sinkronisasi Supabase: ${dbStatus.error || 'Menampilkan cache lokal'}`, 'error');
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  init();
})();
