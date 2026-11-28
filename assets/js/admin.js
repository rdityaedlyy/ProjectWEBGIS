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
    role: LStore.normalizeAnyRole(session.role || 'user'),
    originRole: LStore.normalizeAnyRole(session.originRole || session.role || 'user'),
    admins: [],
    users: [],
    parcels: [],
    rowFeatures: [],
    project: LStore.loadProjectConfig(),
    logs: [],
    downloadRequests: [],
    activeTab: 'accounts',
    selectedParcelIds: new Set(),
    editingAdminId: null,
    editingUserId: null,
    editingParcelId: null,
    showAdminPasswords: false,
    showUserPasswords: false,
    revealedPassIds: new Set(),
    filters: {
      adminSearch: '',
      userSearch: '',
      userRole: 'ALL',
      parcelSearch: '',
      parcelStatus: 'ALL',
      parcelDesa: 'ALL',
      dlReqSearch: '',
      dlReqStatus: 'pending',
      logType: 'ALL',
      logSearch: ''
    }
  };

  const el = {
    adminProjectSub: document.getElementById('adminProjectSub'),
    navAdminLabel: document.getElementById('navAdminLabel'),
    headerUserName: document.getElementById('headerUserName'),
    roleSelect: document.getElementById('roleSelect'),
    roleDot: document.getElementById('roleDot'),
    btnOpenChangePwd: document.getElementById('btnOpenChangePwd'),
    btnLogout: document.getElementById('btnLogout'),
    rbacGuard: document.getElementById('rbacGuard'),
    guardRoleName: document.getElementById('guardRoleName'),
    adminWorkspace: document.getElementById('adminWorkspace'),

    tabBtnAccounts: document.getElementById('tabBtnAccounts'),
    tabAccountLabel: document.getElementById('tabAccountLabel'),
    tabAccountCount: document.getElementById('tabAccountCount'),
    tabBtnParcels: document.getElementById('tabBtnParcels'),
    tabParcelCount: document.getElementById('tabParcelCount'),
    tabBtnProject: document.getElementById('tabBtnProject'),
    tabProjectLabel: document.getElementById('tabProjectLabel'),
    tabBtnDownloadRequests: document.getElementById('tabBtnDownloadRequests'),
    tabDlReqCount: document.getElementById('tabDlReqCount'),
    tabBtnLogs: document.getElementById('tabBtnLogs'),
    tabLogCount: document.getElementById('tabLogCount'),

    kpiCardAdmins: document.getElementById('kpiCardAdmins'),
    kpiCardUsers: document.getElementById('kpiCardUsers'),
    kpiCardParcels: document.getElementById('kpiCardParcels'),
    kpiCardUgr: document.getElementById('kpiCardUgr'),
    admKpiAdmins: document.getElementById('admKpiAdmins'),
    admKpiAdminsActive: document.getElementById('admKpiAdminsActive'),
    admKpiUsers: document.getElementById('admKpiUsers'),
    admKpiUsersBreakdown: document.getElementById('admKpiUsersBreakdown'),
    admKpiTotal: document.getElementById('admKpiTotal'),
    admKpiLuasSub: document.getElementById('admKpiLuasSub'),
    admKpiUgr: document.getElementById('admKpiUgr'),
    admKpiBebasSub: document.getElementById('admKpiBebasSub'),

    blockAdminsTable: document.getElementById('blockAdminsTable'),
    adminsTableTitleText: document.getElementById('adminsTableTitleText'),
    adminsAccessNote: document.getElementById('adminsAccessNote'),
    badgeAdminsCount: document.getElementById('badgeAdminsCount'),
    admSearchAdmin: document.getElementById('admSearchAdmin'),
    btnToggleAllAdminPass: document.getElementById('btnToggleAllAdminPass'),
    btnAddAdmin: document.getElementById('btnAddAdmin'),
    thAdminActions: document.getElementById('thAdminActions'),
    admAdminTableBody: document.getElementById('admAdminTableBody'),

    blockUsersTable: document.getElementById('blockUsersTable'),
    usersAccessNote: document.getElementById('usersAccessNote'),
    badgeUsersCount: document.getElementById('badgeUsersCount'),
    admSearchUser: document.getElementById('admSearchUser'),
    btnToggleAllUserPass: document.getElementById('btnToggleAllUserPass'),
    btnAddUser: document.getElementById('btnAddUser'),
    thUserPass: document.getElementById('thUserPass'),
    thUserActions: document.getElementById('thUserActions'),
    admUserTableBody: document.getElementById('admUserTableBody'),

    admSearchParcel: document.getElementById('admSearchParcel'),
    admFilterStatus: document.getElementById('admFilterStatus'),
    admFilterDesa: document.getElementById('admFilterDesa'),
    btnAddParcel: document.getElementById('btnAddParcel'),
    bulkBar: document.getElementById('bulkBar'),
    bulkSelectedCount: document.getElementById('bulkSelectedCount'),
    bulkStatusSelect: document.getElementById('bulkStatusSelect'),
    btnBulkApplyStatus: document.getElementById('btnBulkApplyStatus'),
    bulkDownloadPolicySelect: document.getElementById('bulkDownloadPolicySelect'),
    btnBulkApplyPolicy: document.getElementById('btnBulkApplyPolicy'),
    btnBulkDelete: document.getElementById('btnBulkDelete'),
    chkAllParcels: document.getElementById('chkAllParcels'),
    admParcelTableBody: document.getElementById('admParcelTableBody'),

    projectGridContainer: document.getElementById('projectGridContainer'),
    projectConfigCard: document.getElementById('projectConfigCard'),
    projectConfigForm: document.getElementById('projectConfigForm'),
    cfgName: document.getElementById('cfgName'),
    cfgCode: document.getElementById('cfgCode'),
    cfgRowWidth: document.getElementById('cfgRowWidth'),
    cfgRegion: document.getElementById('cfgRegion'),
    cfgTargetDate: document.getElementById('cfgTargetDate'),
    cfgCenterLat: document.getElementById('cfgCenterLat'),
    cfgCenterLng: document.getElementById('cfgCenterLng'),

    admImportDownloadPolicy: document.getElementById('admImportDownloadPolicy'),
    admImportDropzone: document.getElementById('admImportDropzone'),
    admImportFileInput: document.getElementById('admImportFileInput'),
    admImportFeedback: document.getElementById('admImportFeedback'),
    admRowCountLabel: document.getElementById('admRowCountLabel'),
    admBtnImportRow: document.getElementById('admBtnImportRow'),
    admBtnClearRow: document.getElementById('admBtnClearRow'),
    admRowFileInput: document.getElementById('admRowFileInput'),
    admBtnExportGeojson: document.getElementById('admBtnExportGeojson'),
    admBtnExportExcel: document.getElementById('admBtnExportExcel'),
    admBtnExportShp: document.getElementById('admBtnExportShp'),
    admBtnExportCsv: document.getElementById('admBtnExportCsv'),
    admBtnTemplateXlsx: document.getElementById('admBtnTemplateXlsx'),
    admDbToolsBox: document.getElementById('admDbToolsBox'),
    admBtnBackupDb: document.getElementById('admBtnBackupDb'),
    admBtnRestoreDb: document.getElementById('admBtnRestoreDb'),
    admBtnClearData: document.getElementById('admBtnClearData'),
    admRestoreFileInput: document.getElementById('admRestoreFileInput'),

    admDlReqSearch: document.getElementById('admDlReqSearch'),
    admDlReqFilter: document.getElementById('admDlReqFilter'),
    btnApproveAllDlReqs: document.getElementById('btnApproveAllDlReqs'),
    admDlReqTableBody: document.getElementById('admDlReqTableBody'),

    admLogSearch: document.getElementById('admLogSearch'),
    admLogFilter: document.getElementById('admLogFilter'),
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
    amRole: document.getElementById('amRole'),
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
    pmDownloadPolicy: document.getElementById('pmDownloadPolicy'),
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
  function getAllowedTabsForRole(perm) {
    const allowed = [];
    if (perm.canManageAccounts || perm.canViewUserEmails) allowed.push('accounts');
    if (perm.canEditCore) allowed.push('parcels');
    if (perm.canManageProject || perm.canImport) allowed.push('project');
    if (perm.canEditCore || perm.canEditField) allowed.push('download_requests');
    if (perm.canViewLogs) allowed.push('logs');
    return allowed;
  }

  function setActiveAdminTab(tabName) {
    const perm = RBAC_ROLES[state.role] || RBAC_ROLES.user;
    const allowed = getAllowedTabsForRole(perm);
    const nextTab = allowed.includes(tabName) ? tabName : (allowed[0] || 'parcels');
    state.activeTab = nextTab;

    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === nextTab);
    });
    document.getElementById('panelAccounts').classList.toggle('active', nextTab === 'accounts');
    document.getElementById('panelParcels').classList.toggle('active', nextTab === 'parcels');
    document.getElementById('panelProject').classList.toggle('active', nextTab === 'project');
    document.getElementById('panelDownloadRequests').classList.toggle('active', nextTab === 'download_requests');
    document.getElementById('panelLogs').classList.toggle('active', nextTab === 'logs');
  }

  function applyRbacGuard() {
    const perm = RBAC_ROLES[state.role] || RBAC_ROLES.user;
    const originPerm = RBAC_ROLES[state.originRole] || perm;
    el.roleSelect.value = state.role;
    el.roleSelect.disabled = !originPerm.canSwitchRolePreview;
    el.roleSelect.title = originPerm.canSwitchRolePreview
      ? 'Mode Master: Simulasi Tampilan Role RBAC'
      : `Role terkunci (${originPerm.label})`;
    el.roleDot.style.background = perm.color;
    el.headerUserName.textContent = state.session.name;
    el.adminProjectSub.textContent = `${perm.label} — ${state.project.name} (${state.project.code})`;
    if (el.navAdminLabel) {
      el.navAdminLabel.textContent = state.role === 'staf_ahli' ? 'Kelola Data' : 'Kelola / Admin';
    }

    if (!perm.canAccessAdmin) {
      el.guardRoleName.textContent = perm.label;
      el.rbacGuard.classList.add('show');
      el.adminWorkspace.style.display = 'none';
      return;
    }

    el.rbacGuard.classList.remove('show');
    el.adminWorkspace.style.display = 'flex';

    const showAccounts = Boolean(perm.canManageAccounts || perm.canViewUserEmails);
    const showParcels = Boolean(perm.canEditCore);
    const showProject = Boolean(perm.canManageProject || perm.canImport);
    const showDlReqs = Boolean(perm.canEditCore || perm.canEditField);
    const showLogs = Boolean(perm.canViewLogs);

    el.tabBtnAccounts.style.display = showAccounts ? 'inline-flex' : 'none';
    el.tabBtnParcels.style.display = showParcels ? 'inline-flex' : 'none';
    el.tabBtnProject.style.display = showProject ? 'inline-flex' : 'none';
    el.tabBtnDownloadRequests.style.display = showDlReqs ? 'inline-flex' : 'none';
    el.tabBtnLogs.style.display = showLogs ? 'inline-flex' : 'none';

    el.tabAccountLabel.textContent = perm.canManageAccounts ? 'Kategori Admin & User' : 'Daftar Staf & User';
    el.tabProjectLabel.textContent = perm.canManageProject ? 'Proyek, DB & Import/Export' : 'Import / Export Data';

    el.kpiCardAdmins.style.display = perm.canManageAccounts ? 'block' : 'none';
    el.kpiCardUsers.style.display = showAccounts ? 'block' : 'none';

    el.blockAdminsTable.style.display = showAccounts ? 'flex' : 'none';
    el.adminsTableTitleText.textContent = perm.canManageAccounts
      ? 'Kategori Admin (Master • Admin • Staf Ahli)'
      : 'Staf Ahli (Kategori Admin, di bawah Admin)';
    el.adminsAccessNote.textContent = perm.canManageAccounts
      ? 'Hierarki Kategori Admin: Master > Admin > Staf Ahli (maks. 1 akun per tingkatan). Master melihat & mengelola semua email & sandi.'
      : 'Akses Admin: Melihat email Staf Ahli (di bawah Admin) tanpa kata sandi & tanpa akses detail akun Master.';
    el.btnToggleAllAdminPass.style.display = perm.canViewPasswords ? 'inline-flex' : 'none';
    el.btnAddAdmin.style.display = perm.canManageAccounts ? 'inline-flex' : 'none';
    el.thAdminActions.style.display = perm.canManageAccounts ? 'table-cell' : 'none';

    el.btnToggleAllUserPass.style.display = perm.canViewPasswords ? 'inline-flex' : 'none';
    el.btnAddUser.style.display = perm.canManageAccounts ? 'inline-flex' : 'none';
    el.thUserActions.style.display = perm.canManageAccounts ? 'table-cell' : 'none';
    el.usersAccessNote.textContent = perm.canViewPasswords
      ? 'Akses Master: Menampilkan email, kata sandi, dan pengelolaan penuh seluruh akun User.'
      : 'Akses Admin: Anda dapat melihat email User. Kata sandi & pengelolaan akun dikhususkan untuk Master.';

    el.projectConfigCard.style.display = perm.canManageProject ? 'block' : 'none';
    el.projectGridContainer.style.gridTemplateColumns = perm.canManageProject ? '' : '1fr';
    el.admDbToolsBox.style.display = perm.canBackupRestore ? 'flex' : 'none';
    el.btnClearLogs.style.display = perm.canManageLogs ? 'inline-flex' : 'none';

    setActiveAdminTab(state.activeTab);
    renderSummaryKpis();
    renderAdminTable();
    renderUserTable();
    renderLogsTable();
  }

  // =========================================================================
  // KPI & SUMMARY COUNTS
  // =========================================================================
  function renderSummaryKpis() {
    const activeAdmins = state.admins.filter(a => a.is_active !== false).length;
    const mastersCount = state.admins.filter(a => LStore.normalizeAdminRole(a.role, a.username || a.id) === 'master').length;
    const stafAhliCount = state.admins.filter(a => LStore.normalizeAdminRole(a.role, a.username || a.id) === 'staf_ahli').length;
    const adminsCount = Math.max(0, state.admins.length - mastersCount - stafAhliCount);
    const activeUsers = state.users.filter(u => u.is_active !== false).length;

    const totalLuas = state.parcels.reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
    const totalUgr = state.parcels.reduce((s, f) => s + (Number(f.properties.nilai_ugr) || 0), 0);
    const bebasLuas = state.parcels
      .filter(f => f.properties.status === 'Bebas/Lunas')
      .reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
    const bebasPct = totalLuas > 0 ? (bebasLuas / totalLuas) * 100 : 0;

    el.admKpiAdmins.textContent = formatNumberID(state.admins.length);
    el.admKpiAdminsActive.textContent = `${mastersCount} master • ${adminsCount} admin • ${stafAhliCount} staf (${activeAdmins} aktif)`;

    el.admKpiUsers.textContent = formatNumberID(state.users.length);
    el.admKpiUsersBreakdown.textContent = `${activeUsers} user aktif`;

    el.admKpiTotal.textContent = formatNumberID(state.parcels.length);
    el.admKpiLuasSub.textContent = `${formatNumberID(totalLuas)} m² (${formatNumberID(totalLuas / 10000, 2)} Ha)`;

    el.admKpiUgr.textContent = formatCompactIDR(totalUgr);
    el.admKpiBebasSub.textContent = `${formatNumberID(bebasPct, 1)}% terbebaskan`;

    const perm = RBAC_ROLES[state.role] || RBAC_ROLES.user;
    el.tabAccountCount.textContent = perm.canManageAccounts
      ? (state.admins.length + state.users.length)
      : (stafAhliCount + state.users.length);
    el.tabParcelCount.textContent = state.parcels.length;
    el.tabLogCount.textContent = state.logs.length;
  }

  // =========================================================================
  // TAB 1A: KATEGORI ADMIN (MASTER > ADMIN > STAF AHLI)
  // =========================================================================
  function getAdminHierarchyRank(acc) {
    const r = LStore.normalizeAdminRole(acc.role, acc.username || acc.id);
    if (r === 'master') return 1;
    if (r === 'admin') return 2;
    return 3; // staf_ahli
  }

  function renderAdminTable() {
    const perm = RBAC_ROLES[state.role] || RBAC_ROLES.user;
    if (!perm.canManageAccounts && !perm.canViewUserEmails) {
      el.admAdminTableBody.innerHTML = '';
      el.badgeAdminsCount.textContent = 'TERKUNCI';
      return;
    }

    const canManage = Boolean(perm.canManageAccounts);
    const canViewPwd = Boolean(perm.canViewPasswords);
    const q = state.filters.adminSearch.trim().toLowerCase();
    const list = state.admins
      .filter(a => {
        const roleKey = LStore.normalizeAdminRole(a.role, a.username || a.id);
        // Admin hanya melihat Staf Ahli (di bawah Admin), tidak melihat akun Master
        if (!canManage && roleKey !== 'staf_ahli') return false;
        if (q && !`${a.id} ${a.nama_lengkap} ${a.username} ${a.email} ${a.jabatan} ${roleKey}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => getAdminHierarchyRank(a) - getAdminHierarchyRank(b));

    el.badgeAdminsCount.textContent = `${list.length} BARIS`;

    if (!list.length) {
      const colSpan = canManage ? 10 : 9;
      el.admAdminTableBody.innerHTML = `
        <tr><td colspan="${colSpan}" style="text-align:center; padding: 18px; color: var(--text-muted);">Belum ada data pada tabel <span class="mono">admins</span>.</td></tr>
      `;
      return;
    }

    el.admAdminTableBody.innerHTML = list.map(a => {
      const isActive = a.is_active !== false;
      const isSelf = a.id === state.session.accountId;
      const roleKey = LStore.normalizeAdminRole(a.role, a.username || a.id);
      const roleMeta = RBAC_ROLES[roleKey] || RBAC_ROLES.admin;
      const isRevealed = canViewPwd && (state.showAdminPasswords || state.revealedPassIds.has(a.id));
      const pwdCellHtml = canViewPwd
        ? `<div style="display:inline-flex; align-items:center; gap:6px;">
             <span style="color:${isRevealed ? '#67e8f9' : 'var(--text-muted)'};">${isRevealed ? escapeHtml(a.password || '') : '••••••••'}</span>
             <button type="button" class="btn btn-sm btn-reveal-pass" data-id="${escapeHtml(a.id)}" style="height:22px; padding:0 6px;" title="Lihat/Sembunyikan Sandi">
               <i data-lucide="${isRevealed ? 'eye-off' : 'eye'}" width="11" height="11"></i>
             </button>
           </div>`
        : `<span class="lock-badge"><i data-lucide="lock" width="10" height="10"></i> Khusus Master</span>`;

      return `
        <tr>
          <td class="mono" style="color:${roleMeta.color}; font-weight:700;">${escapeHtml(a.id)}</td>
          <td>${escapeHtml(a.nama_lengkap)} ${isSelf ? '<span class="brand-tag" style="margin-left:4px;">Anda</span>' : ''}</td>
          <td class="mono">${escapeHtml(a.username)}</td>
          <td class="mono" style="color:var(--text-secondary);">${escapeHtml(a.email)}</td>
          <td>
            <span class="status-badge" style="border-color:${roleMeta.color}; color:${roleMeta.color}; background: rgba(15,23,42,0.75);">
              ${escapeHtml(roleMeta.label)}
            </span>
          </td>
          <td class="mono">${pwdCellHtml}</td>
          <td>${escapeHtml(a.jabatan || '-')}</td>
          <td>${isActive ? '<span class="status-badge st-bebas">Aktif</span>' : '<span class="status-badge st-sengketa">Nonaktif</span>'}</td>
          <td class="mono" style="color:var(--text-muted);">${escapeHtml(formatShortDate(a.created_at))}</td>
          ${canManage ? `
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 5px;">
              <button type="button" class="btn btn-primary btn-sm btn-edit-admin" data-id="${escapeHtml(a.id)}" style="height:24px;">Edit</button>
              <button type="button" class="btn btn-sm btn-toggle-admin" data-id="${escapeHtml(a.id)}" style="height:24px;">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button type="button" class="btn btn-danger btn-sm btn-del-admin" data-id="${escapeHtml(a.id)}" style="height:24px;">Hapus</button>
            </div>
          </td>` : ''}
        </tr>
      `;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function openAdminModal(adminId = null) {
    if (!RBAC_ROLES[state.role].canManageAccounts) {
      showToast('Akses ditolak: Hanya Master yang dapat mengelola akun.', 'error');
      return;
    }
    const hasOtherMaster = state.admins.some(a =>
      a.id !== adminId && LStore.normalizeAdminRole(a.role, a.username || a.id) === 'master'
    );
    const hasOtherAdmin = state.admins.some(a =>
      a.id !== adminId && LStore.normalizeAdminRole(a.role, a.username || a.id) === 'admin'
    );
    const hasOtherStaf = state.admins.some(a =>
      a.id !== adminId && LStore.normalizeAdminRole(a.role, a.username || a.id) === 'staf_ahli'
    );
    if (!adminId && hasOtherMaster && hasOtherAdmin && hasOtherStaf) {
      showToast('Kuota penuh: maksimal 1 Master, 1 Admin, dan 1 Staf Ahli. Gunakan Edit pada akun yang tersedia.', 'warn');
      return;
    }

    const optMaster = el.amRole.querySelector('option[value="master"]');
    const optAdmin = el.amRole.querySelector('option[value="admin"]');
    const optStaf = el.amRole.querySelector('option[value="staf_ahli"]');
    if (optMaster) {
      optMaster.disabled = hasOtherMaster;
      optMaster.textContent = hasOtherMaster ? 'Master (Kuota 1/1 Terisi)' : 'Master (100% Akses)';
    }
    if (optAdmin) {
      optAdmin.disabled = hasOtherAdmin;
      optAdmin.textContent = hasOtherAdmin ? 'Admin (Kuota 1/1 Terisi)' : 'Admin (Di bawah Master)';
    }
    if (optStaf) {
      optStaf.disabled = hasOtherStaf;
      optStaf.textContent = hasOtherStaf ? 'Staf Ahli (Kuota 1/1 Terisi)' : 'Staf Ahli (Di bawah Admin)';
    }

    state.editingAdminId = adminId;
    if (adminId) {
      const a = state.admins.find(item => item.id === adminId);
      if (!a) return;
      el.adminModalTitle.innerHTML = `<i data-lucide="shield" width="15" height="15" style="color: var(--st-bebas);"></i> Edit Akun ${escapeHtml(a.id)}`;
      el.amName.value = a.nama_lengkap;
      el.amUsername.value = a.username;
      el.amEmail.value = a.email;
      el.amRole.value = LStore.normalizeAdminRole(a.role, a.username || a.id);
      el.amJabatan.value = a.jabatan || '';
      el.amPassword.value = a.password;
      el.amActive.checked = a.is_active !== false;
    } else {
      el.adminModalTitle.innerHTML = `<i data-lucide="shield-plus" width="15" height="15" style="color: var(--st-bebas);"></i> Tambah Admin / Staf Ahli`;
      el.amName.value = '';
      el.amUsername.value = '';
      el.amEmail.value = '';
      el.amRole.value = !hasOtherStaf ? 'staf_ahli' : !hasOtherAdmin ? 'admin' : 'master';
      el.amJabatan.value = el.amRole.value === 'master'
        ? 'Master & Super Administrator'
        : el.amRole.value === 'staf_ahli'
          ? 'Staf Ahli Teknis & Data'
          : 'Admin Pengawas & Operasional';
      el.amPassword.value = '';
      el.amActive.checked = true;
    }
    el.adminModal.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function saveAdminFromModal(e) {
    e.preventDefault();
    if (!RBAC_ROLES[state.role].canManageAccounts) {
      showToast('Hanya role Master yang berhak mengelola tabel admins.', 'error');
      return;
    }
    const nama_lengkap = el.amName.value.trim();
    const username = el.amUsername.value.trim();
    const email = el.amEmail.value.trim();
    const role = LStore.normalizeAdminRole(el.amRole.value);
    const defaultJabatan = role === 'master'
      ? 'Master & Super Administrator'
      : role === 'staf_ahli'
        ? 'Staf Ahli Teknis & Data'
        : 'Admin Pengawas & Operasional';
    const jabatan = el.amJabatan.value.trim() || defaultJabatan;
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
        const otherActiveMasters = state.admins.filter((a, i) =>
          i !== idx &&
          a.is_active !== false &&
          LStore.normalizeAdminRole(a.role, a.username || a.id) === 'master'
        );
        const wasMaster = LStore.normalizeAdminRole(state.admins[idx].role, state.admins[idx].username || state.admins[idx].id) === 'master';
        if (wasMaster && (role !== 'master' || !is_active) && otherActiveMasters.length === 0) {
          showToast('Minimal harus tersisa 1 akun Master aktif.', 'error');
          return;
        }
        await LStore.updateAdminRecord(state.editingAdminId, {
          nama_lengkap,
          username,
          email,
          role,
          jabatan,
          password,
          is_active
        });
        state.admins = LStore.loadAdmins();
        await logAction(`Edit data ${role} ${state.editingAdminId} (${username}).`, 'admins');
        showToast(`Data akun ${nama_lengkap} (${role}) diperbarui di Supabase.`, 'success');
      } else {
        const created = await LStore.createAdminRecord({
          nama_lengkap,
          username,
          email,
          password,
          role,
          jabatan,
          is_active
        });
        state.admins = LStore.loadAdmins();
        await logAction(`Tambah ${role} baru ${created.id} (${username}) ke tabel admins.`, 'admins');
        showToast(`Akun ${nama_lengkap} (${role}) ditambahkan ke Supabase.`, 'success');
      }

      el.adminModal.classList.remove('open');
      renderSummaryKpis();
      renderAdminTable();
    } catch (err) {
      showToast(`Gagal menyimpan admin: ${err.message}`, 'error');
    }
  }

  // =========================================================================
  // TAB 1B: TABEL USERS (KHUSUS USER / PENGGUNA PUBLIK)
  // =========================================================================
  function renderUserTable() {
    const perm = RBAC_ROLES[state.role] || RBAC_ROLES.user;
    if (!perm.canManageAccounts && !perm.canViewUserEmails) {
      el.admUserTableBody.innerHTML = '';
      el.badgeUsersCount.textContent = 'TERKUNCI';
      return;
    }

    const canViewPwd = Boolean(perm.canViewPasswords);
    const canManage = Boolean(perm.canManageAccounts);
    const q = state.filters.userSearch.trim().toLowerCase();
    const list = state.users.filter(u => {
      if (q && !`${u.id} ${u.nama_lengkap} ${u.username} ${u.email} ${u.unit_kerja}`.toLowerCase().includes(q)) return false;
      return true;
    });

    el.badgeUsersCount.textContent = `${list.length} BARIS`;

    if (!list.length) {
      const colCount = canManage ? 10 : 9;
      el.admUserTableBody.innerHTML = `
        <tr><td colspan="${colCount}" style="text-align:center; padding: 18px; color: var(--text-muted);">Belum ada data pada tabel <span class="mono">users</span>.</td></tr>
      `;
      return;
    }

    el.admUserTableBody.innerHTML = list.map(u => {
      const normalizedRole = LStore.normalizeUserRole(u.role);
      const roleMeta = RBAC_ROLES[normalizedRole] || RBAC_ROLES.user;
      const isActive = u.is_active !== false;
      const isRevealed = canViewPwd && (state.showUserPasswords || state.revealedPassIds.has(u.id));
      const pwdCellHtml = canViewPwd
        ? `<div style="display:inline-flex; align-items:center; gap:6px;">
             <span style="color:${isRevealed ? '#67e8f9' : 'var(--text-muted)'};">${isRevealed ? escapeHtml(u.password || '') : '••••••••'}</span>
             <button type="button" class="btn btn-sm btn-reveal-pass" data-id="${escapeHtml(u.id)}" style="height:22px; padding:0 6px;" title="Lihat/Sembunyikan Sandi">
               <i data-lucide="${isRevealed ? 'eye-off' : 'eye'}" width="11" height="11"></i>
             </button>
           </div>`
        : `<span class="lock-badge"><i data-lucide="lock" width="10" height="10"></i> Khusus Master</span>`;

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
          <td class="mono">${pwdCellHtml}</td>
          <td>${isActive ? '<span class="status-badge st-bebas">Aktif</span>' : '<span class="status-badge st-sengketa">Nonaktif</span>'}</td>
          <td class="mono" style="color:var(--text-muted);">${escapeHtml(formatShortDate(u.created_at))}</td>
          ${canManage ? `
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 5px;">
              <button type="button" class="btn btn-primary btn-sm btn-edit-user" data-id="${escapeHtml(u.id)}" style="height:24px;">Edit</button>
              <button type="button" class="btn btn-sm btn-toggle-user" data-id="${escapeHtml(u.id)}" style="height:24px;">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button type="button" class="btn btn-danger btn-sm btn-del-user" data-id="${escapeHtml(u.id)}" style="height:24px;">Hapus</button>
            </div>
          </td>` : ''}
        </tr>
      `;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function openUserModal(userId = null) {
    if (!RBAC_ROLES[state.role].canManageAccounts) {
      showToast('Akses ditolak: Hanya Master yang dapat mengubah atau menambah akun user.', 'error');
      return;
    }
    state.editingUserId = userId;
    if (userId) {
      const u = state.users.find(item => item.id === userId);
      if (!u) return;
      el.userModalTitle.innerHTML = `<i data-lucide="user-cog" width="15" height="15" style="color: var(--st-bayar);"></i> Edit User ${escapeHtml(u.id)}`;
      el.umName.value = u.nama_lengkap;
      el.umUsername.value = u.username;
      el.umEmail.value = u.email;
      el.umUnit.value = u.unit_kerja || '';
      el.umRole.value = 'user';
      el.umPassword.value = u.password;
      el.umActive.checked = u.is_active !== false;
    } else {
      el.userModalTitle.innerHTML = `<i data-lucide="user-plus" width="15" height="15" style="color: var(--st-bayar);"></i> Tambah User Baru`;
      el.umName.value = '';
      el.umUsername.value = '';
      el.umEmail.value = '';
      el.umUnit.value = 'Pengguna Umum';
      el.umRole.value = 'user';
      el.umPassword.value = '';
      el.umActive.checked = true;
    }
    el.userModal.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function saveUserFromModal(e) {
    e.preventDefault();
    if (!RBAC_ROLES[state.role].canManageAccounts) {
      showToast('Hanya role Master yang berhak mengelola akun user.', 'error');
      return;
    }
    const nama_lengkap = el.umName.value.trim();
    const username = el.umUsername.value.trim();
    const email = el.umEmail.value.trim();
    const unit_kerja = el.umUnit.value.trim() || 'Pengguna Umum';
    const role = 'user';
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
        <tr><td colspan="11" style="text-align:center; padding: 24px; color: var(--text-muted);">${emptyText}</td></tr>
      `;
      syncBulkBar();
      return;
    }

    el.admParcelTableBody.innerHTML = list.map(f => {
      const p = f.properties;
      const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['Belum Diproses'];
      const checked = state.selectedParcelIds.has(p.id_bidang) ? 'checked' : '';
      const isOpenDl = LStore.normalizeDownloadPolicy(p.download_policy) === 'open';
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
          <td>
            <button type="button" class="btn btn-sm btn-toggle-dl-policy" data-id="${escapeHtml(p.id_bidang)}" style="height:24px; font-size:10.5px; border-color:${isOpenDl ? 'rgba(16,185,129,0.55)' : 'rgba(245,158,11,0.55)'}; color:${isOpenDl ? '#34d399' : '#fbbf24'};" title="Klik untuk ubah izin download pengguna">
              ${isOpenDl ? 'Langsung Unduh' : 'Menunggu Izin'}
            </button>
          </td>
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
    el.rhLat.value = state.project.centerLat ?? LStore.DEFAULT_CENTER_LAT;
    el.rhLng.value = state.project.centerLng ?? LStore.DEFAULT_CENTER_LNG;

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
      el.pmDownloadPolicy.value = LStore.normalizeDownloadPolicy(p.download_policy);
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
      el.pmDownloadPolicy.value = 'approval';
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
    const downloadPolicy = LStore.normalizeDownloadPolicy(el.pmDownloadPolicy.value);
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
            download_policy: downloadPolicy,
            catatan
          }
        };
        await LStore.upsertParcel(updatedFeat, state.session.accountId);
        state.parcels = LStore.loadParcels();
        await logAction(`Edit persil ${existing.properties.id_bidang} (${status}, akses: ${downloadPolicy}).`, 'parcels');
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
            download_policy: downloadPolicy,
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
    el.cfgCenterLat.value = state.project.centerLat ?? LStore.DEFAULT_CENTER_LAT;
    el.cfgCenterLng.value = state.project.centerLng ?? LStore.DEFAULT_CENTER_LNG;
    el.admRowCountLabel.textContent = `${state.rowFeatures.length} fitur`;
  }

  async function handleAdminImportFile(file) {
    if (!file) return;
    try {
      const selectedPolicy = el.admImportDownloadPolicy ? el.admImportDownloadPolicy.value : 'approval';
      const result = await LStore.parseUploadedDatasetFile(file, state.parcels, {
        defaultDownloadPolicy: selectedPolicy,
        applyDownloadPolicyToUpdate: true
      });
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
    const perm = RBAC_ROLES[state.role] || RBAC_ROLES.user;
    if (!perm.canViewLogs) {
      el.admLogTableBody.innerHTML = '';
      return;
    }

    const q = (state.filters.logSearch || '').trim().toLowerCase();
    const logType = state.filters.logType || 'ALL';
    const filtered = state.logs.filter(item => {
      const pageNorm = String(item.page || '').toLowerCase();
      const textNorm = String(item.text || '').toLowerCase();
      const typeNorm = String(item.accountType || '').toLowerCase();
      const isLogin = pageNorm === 'login' || textNorm.includes('login berhasil') || textNorm.includes('masuk ke sistem');
      const isDataChange = ['parcels', 'project_settings', 'database'].includes(typeNorm)
        || /\b(update|edit|tambah|hapus|import|bulk|konfigurasi|row)\b/i.test(item.text || '');

      if (logType === 'LOGIN' && !isLogin) return false;
      if (logType === 'DATA' && !isDataChange) return false;
      if (q && !`${item.actor} ${item.accountType} ${item.page} ${item.text}`.toLowerCase().includes(q)) return false;
      return true;
    });

    if (!filtered.length) {
      el.admLogTableBody.innerHTML = `
        <tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">Tidak ada log aktivitas yang cocok dengan filter.</td></tr>
      `;
      return;
    }
    el.admLogTableBody.innerHTML = filtered.map(item => `
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
  // TAB 5: ANTREAN IZIN DOWNLOAD
  // =========================================================================
  function renderDownloadRequestsTable() {
    const list = state.downloadRequests || [];
    const pendingCount = list.filter(r => r.status === 'pending').length;
    el.tabDlReqCount.textContent = pendingCount;

    const q = state.filters.dlReqSearch.trim().toLowerCase();
    const stFilter = state.filters.dlReqStatus;
    const filtered = list.filter(r => {
      if (stFilter !== 'ALL' && r.status !== stFilter) return false;
      if (q && !`${r.requester_name} ${r.requester_username} ${r.parcel_id} ${r.parcel_owner} ${r.request_note}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (!filtered.length) {
      el.admDlReqTableBody.innerHTML = `
        <tr><td colspan="8" style="text-align:center; padding: 22px; color: var(--text-muted);">Belum ada permintaan izin download untuk filter ini.</td></tr>
      `;
      return;
    }

    el.admDlReqTableBody.innerHTML = filtered.map(r => {
      const stBadge = r.status === 'approved'
        ? '<span class="status-badge st-bebas">Disetujui</span>'
        : r.status === 'rejected'
          ? '<span class="status-badge st-sengketa">Ditolak</span>'
          : '<span class="status-badge st-nego">Menunggu Izin</span>';
      const createdTxt = formatShortDate(r.created_at);
      const reviewerTxt = r.reviewed_by_name
        ? `${escapeHtml(r.reviewed_by_name)} (${escapeHtml(r.reviewed_by_role || '')})`
        : '<span style="color:var(--text-muted);">-</span>';

      return `
        <tr>
          <td class="mono" style="color:var(--text-muted);">${escapeHtml(createdTxt)}</td>
          <td>
            <div style="font-weight:600;">${escapeHtml(r.requester_name)}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-secondary);">@${escapeHtml(r.requester_username)}</div>
          </td>
          <td>
            <div class="mono" style="font-weight:700; color:#67e8f9;">${escapeHtml(r.parcel_id)}</div>
            <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(r.parcel_owner || '-')}</div>
          </td>
          <td class="mono" style="font-size:10.5px;">${escapeHtml(String(r.requested_formats || 'xlsx,geojson,shp,csv').toUpperCase())}</td>
          <td style="color:var(--text-secondary);">${escapeHtml(r.request_note || '-')}</td>
          <td>${stBadge}</td>
          <td style="font-size:11px;">${reviewerTxt}</td>
          <td style="text-align:right;">
            <div style="display:inline-flex; gap:5px;">
              ${r.status !== 'approved' ? `<button type="button" class="btn btn-success btn-sm btn-approve-dlreq" data-id="${escapeHtml(r.id)}" style="height:24px;">Setujui</button>` : ''}
              ${r.status !== 'rejected' ? `<button type="button" class="btn btn-danger btn-sm btn-reject-dlreq" data-id="${escapeHtml(r.id)}" style="height:24px;">Tolak</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveAdminTab(btn.getAttribute('data-tab'));
    });
  });

  el.roleSelect.addEventListener('change', () => {
    const originPerm = RBAC_ROLES[state.originRole];
    if (!originPerm || !originPerm.canSwitchRolePreview) return;
    state.role = LStore.normalizeAnyRole(el.roleSelect.value);
    state.session.role = state.role;
    LStore.saveSession(state.session);
    applyRbacGuard();
    renderSummaryKpis();
    showToast(`Mode pratinjau role diubah ke: ${RBAC_ROLES[state.role].label}`, 'info');
  });

  el.btnLogout.addEventListener('click', async () => {
    try {
      await LStore.pushLog(state.session.name, state.session.table || 'admins', 'Kelola', 'Keluar dari Konsol.');
    } catch (_err) {}
    LStore.clearSession();
    window.location.href = 'index.html';
  });

  // Logs filters
  el.admLogSearch.addEventListener('input', () => {
    state.filters.logSearch = el.admLogSearch.value;
    renderLogsTable();
  });
  el.admLogFilter.addEventListener('change', () => {
    state.filters.logType = el.admLogFilter.value;
    renderLogsTable();
  });

  // Admins table filters & actions
  el.admSearchAdmin.addEventListener('input', () => {
    state.filters.adminSearch = el.admSearchAdmin.value;
    renderAdminTable();
  });
  el.btnToggleAllAdminPass.addEventListener('click', () => {
    if (!RBAC_ROLES[state.role].canViewPasswords) return;
    state.showAdminPasswords = !state.showAdminPasswords;
    el.btnToggleAllAdminPass.innerHTML = state.showAdminPasswords
      ? '<i data-lucide="eye-off" width="12" height="12"></i> Sembunyikan Sandi'
      : '<i data-lucide="eye" width="12" height="12"></i> Tampilkan Sandi';
    renderAdminTable();
  });
  el.btnAddAdmin.addEventListener('click', () => openAdminModal(null));
  el.btnCloseAdminModal.addEventListener('click', () => el.adminModal.classList.remove('open'));
  el.btnCancelAdminModal.addEventListener('click', () => el.adminModal.classList.remove('open'));
  el.adminForm.addEventListener('submit', saveAdminFromModal);

  el.admAdminTableBody.addEventListener('click', async e => {
    const revealBtn = e.target.closest('.btn-reveal-pass');
    if (revealBtn) {
      if (!RBAC_ROLES[state.role].canViewPasswords) return;
      const aid = revealBtn.getAttribute('data-id');
      if (state.revealedPassIds.has(aid)) state.revealedPassIds.delete(aid);
      else state.revealedPassIds.add(aid);
      renderAdminTable();
      return;
    }

    if (!RBAC_ROLES[state.role].canManageAccounts) return;

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
      const isMasterTarget = LStore.normalizeAdminRole(target.role, target.username || target.id) === 'master';
      const otherActiveMasters = state.admins.filter(a =>
        a.id !== aid &&
        a.is_active !== false &&
        LStore.normalizeAdminRole(a.role, a.username || a.id) === 'master'
      );
      if (!nextActive && isMasterTarget && otherActiveMasters.length === 0) {
        showToast('Minimal harus tersisa 1 akun Master aktif.', 'error');
        return;
      }
      try {
        await LStore.updateAdminRecord(aid, { is_active: nextActive });
        state.admins = LStore.loadAdmins();
        renderSummaryKpis();
        renderAdminTable();
        await logAction(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} akun ${target.username}.`, 'admins');
      } catch (err) {
        showToast(`Gagal memperbarui status akun: ${err.message}`, 'error');
      }
      return;
    }

    const delBtn = e.target.closest('.btn-del-admin');
    if (delBtn) {
      const aid = delBtn.getAttribute('data-id');
      const target = state.admins.find(a => a.id === aid);
      if (!target) return;
      const isMasterTarget = LStore.normalizeAdminRole(target.role, target.username || target.id) === 'master';
      const otherActiveMasters = state.admins.filter(a =>
        a.id !== aid &&
        a.is_active !== false &&
        LStore.normalizeAdminRole(a.role, a.username || a.id) === 'master'
      );
      if (isMasterTarget && otherActiveMasters.length === 0) {
        showToast('Tidak dapat menghapus satu-satunya Master aktif.', 'error');
        return;
      }
      try {
        state.admins = await LStore.deleteAdminRecord(aid);
        renderSummaryKpis();
        renderAdminTable();
        await logAction(`Hapus akun ${target.username} dari tabel admins.`, 'admins');
        showToast(`Akun ${target.nama_lengkap} dihapus dari Supabase.`, 'warn');
      } catch (err) {
        showToast(`Gagal menghapus akun: ${err.message}`, 'error');
      }
    }
  });

  // Users table filters & actions
  el.admSearchUser.addEventListener('input', () => {
    state.filters.userSearch = el.admSearchUser.value;
    renderUserTable();
  });
  el.btnToggleAllUserPass.addEventListener('click', () => {
    if (!RBAC_ROLES[state.role].canViewPasswords) return;
    state.showUserPasswords = !state.showUserPasswords;
    el.btnToggleAllUserPass.innerHTML = state.showUserPasswords
      ? '<i data-lucide="eye-off" width="12" height="12"></i> Sembunyikan Sandi'
      : '<i data-lucide="eye" width="12" height="12"></i> Tampilkan Sandi';
    renderUserTable();
  });
  el.btnAddUser.addEventListener('click', () => openUserModal(null));
  el.btnCloseUserModal.addEventListener('click', () => el.userModal.classList.remove('open'));
  el.btnCancelUserModal.addEventListener('click', () => el.userModal.classList.remove('open'));
  el.userForm.addEventListener('submit', saveUserFromModal);

  el.admUserTableBody.addEventListener('click', async e => {
    const revealBtn = e.target.closest('.btn-reveal-pass');
    if (revealBtn) {
      if (!RBAC_ROLES[state.role].canViewPasswords) return;
      const uid = revealBtn.getAttribute('data-id');
      if (state.revealedPassIds.has(uid)) state.revealedPassIds.delete(uid);
      else state.revealedPassIds.add(uid);
      renderUserTable();
      return;
    }

    if (!RBAC_ROLES[state.role].canManageAccounts) return;

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
    const toggleDlBtn = e.target.closest('.btn-toggle-dl-policy');
    if (toggleDlBtn) {
      const id = toggleDlBtn.getAttribute('data-id');
      const feat = state.parcels.find(f => f.properties.id_bidang === id);
      if (!feat) return;
      const curPolicy = LStore.normalizeDownloadPolicy(feat.properties.download_policy);
      const nextPolicy = curPolicy === 'open' ? 'approval' : 'open';
      try {
        const updated = {
          ...feat,
          properties: { ...feat.properties, download_policy: nextPolicy }
        };
        await LStore.upsertParcel(updated, state.session.accountId);
        state.parcels = LStore.loadParcels();
        renderParcelTable();
        await logAction(`Ubah akses download persil ${id} -> ${nextPolicy}.`, 'parcels');
        showToast(`Izin download ${id}: ${nextPolicy === 'open' ? 'Langsung Bisa Didownload' : 'Menunggu Izin'}.`, 'success');
      } catch (err) {
        showToast(`Gagal mengubah izin download: ${err.message}`, 'error');
      }
      return;
    }
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

  el.btnBulkApplyPolicy.addEventListener('click', async () => {
    if (!state.selectedParcelIds.size) return;
    const targetPolicy = LStore.normalizeDownloadPolicy(el.bulkDownloadPolicySelect.value);
    let count = 0;
    const nextParcels = state.parcels.map(f => {
      if (!state.selectedParcelIds.has(f.properties.id_bidang)) return f;
      count++;
      return {
        ...f,
        properties: { ...f.properties, download_policy: targetPolicy }
      };
    });
    try {
      state.parcels = await LStore.upsertManyParcels(nextParcels, state.session.accountId);
      state.selectedParcelIds.clear();
      renderParcelTable();
      await logAction(`Bulk update akses download ${count} persil -> ${targetPolicy}.`, 'parcels');
      showToast(`${count} persil diatur ke: ${targetPolicy === 'open' ? 'Langsung Bisa Didownload' : 'Menunggu Izin'}.`, 'success');
    } catch (err) {
      showToast(`Gagal update izin download massal: ${err.message}`, 'error');
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
    if (!RBAC_ROLES[state.role].canManageProject) {
      showToast('Akses ditolak: Hanya Master & Admin yang dapat mengubah konfigurasi proyek.', 'error');
      return;
    }
    const nextProject = {
      name: el.cfgName.value.trim(),
      code: el.cfgCode.value.trim(),
      rowWidth: Math.max(10, parseInt(el.cfgRowWidth.value, 10) || 90),
      region: el.cfgRegion.value.trim(),
      targetDate: el.cfgTargetDate.value,
      centerLat: Number(el.cfgCenterLat.value) || LStore.DEFAULT_CENTER_LAT,
      centerLng: Number(el.cfgCenterLng.value) || LStore.DEFAULT_CENTER_LNG
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

  el.admBtnExportShp.addEventListener('click', () => {
    if (!state.parcels.length) {
      showToast('Tabel parcels masih kosong.', 'warn');
      return;
    }
    try {
      LStore.exportFeaturesToShapefile(state.parcels, 'all');
      logAction(`Export Shapefile (${state.parcels.length} persil).`, 'parcels');
      showToast('Shapefile (.shp/.zip) berhasil diunduh.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  el.admBtnExportCsv.addEventListener('click', () => {
    if (!state.parcels.length) {
      showToast('Tabel parcels masih kosong.', 'warn');
      return;
    }
    try {
      LStore.exportFeaturesToCSV(state.parcels, 'all');
      logAction(`Export CSV (${state.parcels.length} persil).`, 'parcels');
      showToast('Data CSV (.csv) berhasil diunduh.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  el.admDlReqSearch.addEventListener('input', () => {
    state.filters.dlReqSearch = el.admDlReqSearch.value;
    renderDownloadRequestsTable();
  });

  el.admDlReqFilter.addEventListener('change', () => {
    state.filters.dlReqStatus = el.admDlReqFilter.value;
    renderDownloadRequestsTable();
  });

  el.admDlReqTableBody.addEventListener('click', async e => {
    const appBtn = e.target.closest('.btn-approve-dlreq');
    const rejBtn = e.target.closest('.btn-reject-dlreq');
    if (!appBtn && !rejBtn) return;
    const reqId = (appBtn || rejBtn).getAttribute('data-id');
    const decision = appBtn ? 'approved' : 'rejected';
    try {
      const updated = await LStore.reviewDownloadRequest(reqId, decision, state.session);
      state.downloadRequests = LStore.loadDownloadRequests();
      renderDownloadRequestsTable();
      await logAction(`${decision === 'approved' ? 'Setujui' : 'Tolak'} izin download persil ${updated ? updated.parcel_id : reqId}.`, 'download_requests');
      showToast(`Permintaan izin download ${decision === 'approved' ? 'disetujui' : 'ditolak'}.`, decision === 'approved' ? 'success' : 'warn');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  el.btnApproveAllDlReqs.addEventListener('click', async () => {
    const pendings = (state.downloadRequests || []).filter(r => r.status === 'pending');
    if (!pendings.length) {
      showToast('Tidak ada permintaan izin yang menunggu persetujuan.', 'info');
      return;
    }
    try {
      for (const req of pendings) {
        await LStore.reviewDownloadRequest(req.id, 'approved', state.session, 'Disetujui massal');
      }
      state.downloadRequests = LStore.loadDownloadRequests();
      renderDownloadRequestsTable();
      await logAction(`Setujui massal ${pendings.length} permintaan izin download.`, 'download_requests');
      showToast(`${pendings.length} permintaan izin download disetujui.`, 'success');
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
    if (!RBAC_ROLES[state.role].canBackupRestore) {
      showToast('Akses ditolak: Backup database (berisi kata sandi) khusus untuk Master.', 'error');
      return;
    }
    LStore.exportDatabaseBackupJson();
    logAction('Export backup seluruh database (.json).', 'database');
    showToast('Backup database JSON berhasil diunduh.', 'success');
  });

  el.admBtnRestoreDb.addEventListener('click', () => {
    if (!RBAC_ROLES[state.role].canBackupRestore) {
      showToast('Akses ditolak: Restore database khusus untuk Master.', 'error');
      return;
    }
    el.admRestoreFileInput.click();
  });
  el.admRestoreFileInput.addEventListener('change', async e => {
    if (!RBAC_ROLES[state.role].canBackupRestore) {
      el.admRestoreFileInput.value = '';
      showToast('Akses ditolak: Restore database khusus untuk Master.', 'error');
      return;
    }
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
    if (!RBAC_ROLES[state.role].canBackupRestore) {
      showToast('Akses ditolak: Reset tabel operasional khusus untuk Master.', 'error');
      return;
    }
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
    if (!RBAC_ROLES[state.role].canManageLogs) {
      showToast('Akses ditolak: Hanya Master yang dapat membersihkan log audit.', 'error');
      return;
    }
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
    state.downloadRequests = LStore.loadDownloadRequests();

    applyRbacGuard();
    refreshDesaFilterOptions();
    renderSummaryKpis();
    renderAdminTable();
    renderUserTable();
    renderParcelTable();
    renderProjectForm();
    renderDownloadRequestsTable();
    renderLogsTable();

    LStore.bindChangePasswordUI({
      buttonEl: el.btnOpenChangePwd,
      session: state.session,
      pageName: 'Kelola',
      toastStack: el.toastStack,
      onSuccess: () => {
        state.admins = LStore.loadAdmins();
        state.users = LStore.loadUsers();
        state.logs = LStore.loadLogs();
        renderAdminTable();
        renderUserTable();
        renderLogsTable();
        renderSummaryKpis();
      }
    });

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
