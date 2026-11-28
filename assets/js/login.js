(() => {
  'use strict';

  const LStore = window.LANDACQ;
  let pendingRedirect = null;

  const el = {
    loginProjectTitle: document.getElementById('loginProjectTitle'),
    loginProjectSub: document.getElementById('loginProjectSub'),
    loginProjectCode: document.getElementById('loginProjectCode'),
    homeStatParcels: document.getElementById('homeStatParcels'),
    homeStatDesa: document.getElementById('homeStatDesa'),
    homeStatLuas: document.getElementById('homeStatLuas'),
    homeStatHa: document.getElementById('homeStatHa'),
    homeStatBebasPct: document.getElementById('homeStatBebasPct'),
    homeStatBebasLuas: document.getElementById('homeStatBebasLuas'),
    homeStatUgr: document.getElementById('homeStatUgr'),
    homeStatUgrExact: document.getElementById('homeStatUgrExact'),

    authCardTitle: document.getElementById('authCardTitle'),
    authCardSub: document.getElementById('authCardSub'),
    tabBtnLogin: document.getElementById('tabBtnLogin'),
    tabBtnRegister: document.getElementById('tabBtnRegister'),
    btnGoRegister: document.getElementById('btnGoRegister'),
    btnGoLogin: document.getElementById('btnGoLogin'),

    sessionResumeBar: document.getElementById('sessionResumeBar'),
    resumeUserText: document.getElementById('resumeUserText'),
    btnResumeAdmin: document.getElementById('btnResumeAdmin'),
    btnResumeLogout: document.getElementById('btnResumeLogout'),

    loginAlert: document.getElementById('loginAlert'),
    loginAlertText: document.getElementById('loginAlertText'),

    loginForm: document.getElementById('loginForm'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    btnTogglePwd: document.getElementById('btnTogglePwd'),

    registerForm: document.getElementById('registerForm'),
    regName: document.getElementById('regName'),
    regUsername: document.getElementById('regUsername'),
    regUnit: document.getElementById('regUnit'),
    regPassword: document.getElementById('regPassword'),
    regConfirmPassword: document.getElementById('regConfirmPassword'),
    btnToggleRegPwd: document.getElementById('btnToggleRegPwd')
  };

  function showAlert(msg, type = 'error') {
    const cls = type === 'info' ? 'alert-info' : type === 'success' ? 'alert-success' : 'alert-error';
    el.loginAlert.className = `alert-box show ${cls}`;
    el.loginAlertText.textContent = msg;
  }

  function clearAlert() {
    el.loginAlert.className = 'alert-box';
    el.loginAlertText.textContent = '';
  }

  function switchAuthMode(mode, keepAlert = false) {
    const isRegister = mode === 'register';
    if (!keepAlert) clearAlert();

    el.tabBtnLogin.classList.toggle('active', !isRegister);
    el.tabBtnRegister.classList.toggle('active', isRegister);
    el.tabBtnLogin.setAttribute('aria-selected', String(!isRegister));
    el.tabBtnRegister.setAttribute('aria-selected', String(isRegister));

    el.loginForm.style.display = isRegister ? 'none' : 'flex';
    el.registerForm.style.display = isRegister ? 'flex' : 'none';

    el.authCardTitle.innerHTML = isRegister
      ? '<i data-lucide="user-plus" width="18" height="18" style="color: var(--st-bebas);"></i> Daftar Akun Baru'
      : '<i data-lucide="lock-keyhole" width="18" height="18" style="color: var(--accent-cyan);"></i> Masuk ke Sistem WebGIS';
    el.authCardSub.textContent = isRegister
      ? 'Registrasi akun baru otomatis terdaftar sebagai User / Pengguna di tabel users.'
      : 'Masuk dengan akun Anda atau daftar akun User baru untuk melihat peta.';

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function renderProjectPreview() {
    const project = LStore.loadProjectConfig();
    const parcels = LStore.loadParcels();

    el.loginProjectTitle.textContent = `Command Center ${project.name}`;
    el.loginProjectSub.textContent = `Sistem Informasi Geografis Pembebasan Lahan — ${project.name} (${project.region})`;
    el.loginProjectCode.textContent = project.code;

    const totalLuas = parcels.reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
    const totalUgr = parcels.reduce((s, f) => s + (Number(f.properties.nilai_ugr) || 0), 0);
    const bebasLuas = parcels
      .filter(f => f.properties.status === 'Bebas/Lunas')
      .reduce((s, f) => s + (Number(f.properties.luas_m2) || 0), 0);
    const bebasPct = totalLuas > 0 ? (bebasLuas / totalLuas) * 100 : 0;
    const desaCount = new Set(parcels.map(f => f.properties.desa)).size;

    el.homeStatParcels.textContent = LStore.formatNumberID(parcels.length);
    el.homeStatDesa.textContent = `${desaCount} wilayah desa/kelurahan`;
    el.homeStatLuas.textContent = `${LStore.formatNumberID(totalLuas)} m²`;
    el.homeStatHa.textContent = `${LStore.formatNumberID(totalLuas / 10000, 2)} Ha`;
    el.homeStatBebasPct.textContent = `${LStore.formatNumberID(bebasPct, 1)}%`;
    el.homeStatBebasLuas.textContent = `${LStore.formatNumberID(bebasLuas)} m² lunas`;
    el.homeStatUgr.textContent = LStore.formatCompactIDR(totalUgr);
    el.homeStatUgrExact.textContent = LStore.formatCurrencyIDR(totalUgr);
  }

  function checkDatabaseBootstrapAndSession() {
    const admins = LStore.loadAdmins();
    const users = LStore.loadUsers();

    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get('next');
    if (nextParam === 'admin.html' || nextParam === 'peta.html') {
      pendingRedirect = nextParam;
    }

    const session = LStore.loadSession();
    if (session) {
      el.sessionResumeBar.classList.add('show');
      const roleMeta = LStore.RBAC_ROLES[session.role] || {};
      const roleLabel = roleMeta.label || session.role;
      el.resumeUserText.textContent = `${session.name} (${roleLabel})`;
      const canAdm = Boolean((LStore.RBAC_ROLES[session.originRole] || roleMeta).canAccessAdmin);
      el.btnResumeAdmin.style.display = canAdm ? 'inline-flex' : 'none';
      if (canAdm && session.role === 'staf_ahli') {
        el.btnResumeAdmin.innerHTML = '<i data-lucide="settings-2" width="12" height="12"></i> Kelola Data';
      }
    } else {
      el.sessionResumeBar.classList.remove('show');
    }

    const dbStatus = LStore.getDbStatus();
    if (!dbStatus.connected && dbStatus.error) {
      const hint = /42501|permission denied/i.test(dbStatus.error)
        ? ' Jalankan perintah GRANT di Supabase SQL Editor.'
        : '';
      showAlert(`Gagal terhubung ke Supabase: ${dbStatus.error}.${hint}`, 'error');
      return;
    }

    if (admins.length === 0 && users.length === 0) {
      switchAuthMode('register', true);
      showAlert('Database akun masih kosong. Daftar sebagai User baru atau jalankan dummy SQL di database/schema.sql.', 'info');
    } else if (pendingRedirect && !session) {
      showAlert(`Silakan masuk terlebih dahulu untuk mengakses halaman ${pendingRedirect === 'admin.html' ? 'Kelola' : 'Peta WebGIS'}.`, 'info');
    }
  }

  async function loginAndRedirect(account, table) {
    const role = table === 'admins'
      ? LStore.normalizeAdminRole(account.role, account.username || account.id)
      : LStore.normalizeUserRole(account.role);
    LStore.saveSession({
      accountId: account.id,
      table,
      name: account.nama_lengkap,
      username: account.username,
      email: account.email,
      role,
      originRole: role,
      unit: account.jabatan || account.unit_kerja || '',
      loginAt: new Date().toISOString()
    });

    try {
      await LStore.pushLog(
        account.nama_lengkap,
        table,
        'Login',
        `Login berhasil: ${account.nama_lengkap} (${account.username} / ${account.email}) — Role ${LStore.RBAC_ROLES[role].label}.`
      );
    } catch (err) {
      console.warn('Gagal mencatat log login:', err);
    }

    let target = pendingRedirect || 'peta.html';
    if (target === 'admin.html' && !LStore.RBAC_ROLES[role].canAccessAdmin) {
      target = 'peta.html';
    }
    if (!pendingRedirect) {
      target = 'peta.html';
    }
    window.location.href = target;
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const submitBtn = el.loginForm.querySelector('button[type="submit"]');
    const identifier = String(el.loginUsername.value || '').trim();
    const pwd = String(el.loginPassword.value || '');

    if (submitBtn) submitBtn.disabled = true;
    try {
      if (!LStore.getDbStatus().connected) {
        await LStore.initDb();
      }
      const dbStatus = LStore.getDbStatus();
      if (!dbStatus.connected) {
        const hint = /42501|permission denied/i.test(dbStatus.error || '')
          ? ' Jalankan perintah GRANT di Supabase SQL Editor.'
          : '';
        showAlert(`Supabase belum dapat diakses: ${dbStatus.error || 'Koneksi gagal'}.${hint}`, 'error');
        return;
      }

      const result = LStore.authenticateAccount(identifier, pwd);
      if (!result) {
        showAlert('Email/username atau kata sandi tidak ditemukan pada tabel admins maupun users.', 'error');
        return;
      }

      if (result.account.is_active === false) {
        showAlert('Akun ini sedang dinonaktifkan oleh Administrator.', 'error');
        return;
      }

      await loginAndRedirect(result.account, result.table);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    const submitBtn = el.registerForm.querySelector('button[type="submit"]');
    const nama_lengkap = String(el.regName.value || '').trim();
    const username = String(el.regUsername.value || '').trim();
    const unit = String(el.regUnit.value || '').trim();
    const password = String(el.regPassword.value || '');
    const confirm = String(el.regConfirmPassword.value || '');

    if (!nama_lengkap || !username) {
      showAlert('Nama lengkap dan email/username wajib diisi.', 'error');
      return;
    }
    if (password.length < 6) {
      showAlert('Kata sandi minimal 6 karakter.', 'error');
      return;
    }
    if (password !== confirm) {
      showAlert('Konfirmasi kata sandi tidak cocok.', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    try {
      if (!LStore.getDbStatus().connected) {
        await LStore.initDb();
      }
      const dbStatus = LStore.getDbStatus();
      if (!dbStatus.connected) {
        const hint = /42501|permission denied/i.test(dbStatus.error || '')
          ? ' Jalankan perintah GRANT di Supabase SQL Editor.'
          : '';
        showAlert(`Supabase belum dapat diakses: ${dbStatus.error || 'Koneksi gagal'}.${hint}`, 'error');
        return;
      }

      if (LStore.isIdentifierTaken(username, username)) {
        showAlert(`Email/username "${username}" sudah terdaftar di tabel admins/users.`, 'error');
        return;
      }

      const createdAccount = await LStore.createUserRecord({
        nama_lengkap,
        username,
        email: username,
        password,
        role: 'user',
        unit_kerja: unit || 'Pengguna Umum',
        is_active: true
      });
      try {
        await LStore.pushLog(nama_lengkap, 'users', 'Register', `Registrasi akun user baru ke tabel users (${createdAccount.id}).`);
      } catch (_err) {}

      await loginAndRedirect(createdAccount, 'users');
    } catch (err) {
      showAlert(err.message || 'Gagal menyimpan akun baru ke Supabase.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  el.tabBtnLogin.addEventListener('click', () => switchAuthMode('login'));
  el.tabBtnRegister.addEventListener('click', () => switchAuthMode('register'));
  el.btnGoRegister.addEventListener('click', () => switchAuthMode('register'));
  el.btnGoLogin.addEventListener('click', () => switchAuthMode('login'));

  el.loginForm.addEventListener('submit', handleLoginSubmit);
  el.registerForm.addEventListener('submit', handleRegisterSubmit);

  el.btnTogglePwd.addEventListener('click', () => {
    el.loginPassword.type = el.loginPassword.type === 'password' ? 'text' : 'password';
  });

  el.btnToggleRegPwd.addEventListener('click', () => {
    const nextType = el.regPassword.type === 'password' ? 'text' : 'password';
    el.regPassword.type = nextType;
    el.regConfirmPassword.type = nextType;
  });

  el.btnResumeLogout.addEventListener('click', () => {
    LStore.clearSession();
    checkDatabaseBootstrapAndSession();
  });

  async function init() {
    await LStore.initDb();
    renderProjectPreview();
    checkDatabaseBootstrapAndSession();
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  init();
})();
