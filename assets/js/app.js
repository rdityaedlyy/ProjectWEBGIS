(() => {
  'use strict';

  const LStore = window.LANDACQ;
  const session = LStore.requireAuth('peta.html');
  if (!session) return;

  const {
    STATUS_CONFIG,
    STATUS_ORDER,
    RBAC_ROLES,
    getGeometryCentroid,
    formatNumberID,
    formatCurrencyIDR,
    formatCompactIDR,
    escapeHtml
  } = LStore;

  const state = {
    session,
    role: session.role || 'viewer',
    originRole: session.originRole || session.role || 'viewer',
    projectCfg: LStore.loadProjectConfig(),
    parcels: [],
    rowFeatures: [],
    selectedId: null,
    parcelSnapshotBeforeEdit: null,
    filters: {
      search: '',
      status: 'ALL',
      desa: 'ALL',
      minArea: 0
    },
    sort: {
      field: 'id_bidang',
      dir: 'asc'
    },
    layers: {
      basemap: 'dark',
      showParcels: true,
      showRow: true,
      showLabels: true
    },
    tableCollapsed: false,
    exportScope: 'filtered',
    logs: []
  };

  const el = {
    projectSubtitle: document.getElementById('projectSubtitle'),
    navAdminTab: document.getElementById('navAdminTab'),
    headerUserName: document.getElementById('headerUserName'),
    roleSelect: document.getElementById('roleSelect'),
    roleDot: document.getElementById('roleDot'),
    btnOpenImport: document.getElementById('btnOpenImport'),
    btnOpenExport: document.getElementById('btnOpenExport'),
    btnRefreshDb: document.getElementById('btnRefreshDb'),
    btnLogout: document.getElementById('btnLogout'),
    btnToggleLeft: document.getElementById('btnToggleLeft'),
    btnToggleRight: document.getElementById('btnToggleRight'),
    btnCloseInspectorMobile: document.getElementById('btnCloseInspectorMobile'),
    sidebarLeft: document.getElementById('sidebarLeft'),
    sidebarRight: document.getElementById('sidebarRight'),

    kpiScopeBadge: document.getElementById('kpiScopeBadge'),
    kpiTotalPersil: document.getElementById('kpiTotalPersil'),
    kpiTotalPersilSub: document.getElementById('kpiTotalPersilSub'),
    kpiTotalLuas: document.getElementById('kpiTotalLuas'),
    kpiTotalHa: document.getElementById('kpiTotalHa'),
    kpiBebasPct: document.getElementById('kpiBebasPct'),
    kpiBebasLuas: document.getElementById('kpiBebasLuas'),
    kpiBebasBar: document.getElementById('kpiBebasBar'),
    kpiTotalUgr: document.getElementById('kpiTotalUgr'),
    kpiTotalUgrExact: document.getElementById('kpiTotalUgrExact'),
    chartCenterPct: document.getElementById('chartCenterPct'),
    chartLegendList: document.getElementById('chartLegendList'),

    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    filterStatus: document.getElementById('filterStatus'),
    filterDesa: document.getElementById('filterDesa'),
    filterMinArea: document.getElementById('filterMinArea'),
    filterMinAreaVal: document.getElementById('filterMinAreaVal'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    filterCountText: document.getElementById('filterCountText'),
    activeFilterNote: document.getElementById('activeFilterNote'),

    mapCtrlPanel: document.getElementById('mapCtrlPanel'),
    mapCtrlToggle: document.getElementById('mapCtrlToggle'),
    mapCtrlChevron: document.getElementById('mapCtrlChevron'),
    toggleParcels: document.getElementById('toggleParcels'),
    toggleRow: document.getElementById('toggleRow'),
    toggleLabels: document.getElementById('toggleLabels'),
    btnFitAll: document.getElementById('btnFitAll'),
    btnFitRow: document.getElementById('btnFitRow'),
    mapLegendRows: document.getElementById('mapLegendRows'),
    coordTelemetry: document.getElementById('coordTelemetry'),

    attrDrawer: document.getElementById('attrDrawer'),
    attrDrawerHead: document.getElementById('attrDrawerHead'),
    btnToggleTable: document.getElementById('btnToggleTable'),
    tableToggleLabel: document.getElementById('tableToggleLabel'),
    tableCountBadge: document.getElementById('tableCountBadge'),
    attrTableBody: document.getElementById('attrTableBody'),

    rbacBanner: document.getElementById('rbacBanner'),
    rbacBannerIconWrap: document.getElementById('rbacBannerIconWrap'),
    rbacBannerTitle: document.getElementById('rbacBannerTitle'),
    rbacBannerDesc: document.getElementById('rbacBannerDesc'),
    inspectorEmpty: document.getElementById('inspectorEmpty'),
    inspectorForm: document.getElementById('inspectorForm'),
    inspIdTitle: document.getElementById('inspIdTitle'),
    inspStatusBadge: document.getElementById('inspStatusBadge'),
    inspCoord: document.getElementById('inspCoord'),
    inspHa: document.getElementById('inspHa'),
    btnZoomSelected: document.getElementById('btnZoomSelected'),
    btnClearSelection: document.getElementById('btnClearSelection'),

    editIdBidang: document.getElementById('editIdBidang'),
    editPemilik: document.getElementById('editPemilik'),
    editDesa: document.getElementById('editDesa'),
    editLuas: document.getElementById('editLuas'),
    editUgr: document.getElementById('editUgr'),
    editUgrFormatted: document.getElementById('editUgrFormatted'),
    editStatus: document.getElementById('editStatus'),
    editProgresRange: document.getElementById('editProgresRange'),
    editProgresNum: document.getElementById('editProgresNum'),
    editProgresText: document.getElementById('editProgresText'),
    editCatatan: document.getElementById('editCatatan'),

    lockPemilik: document.getElementById('lockPemilik'),
    lockDesa: document.getElementById('lockDesa'),
    lockLuas: document.getElementById('lockLuas'),
    lockUgr: document.getElementById('lockUgr'),
    lockStatus: document.getElementById('lockStatus'),
    lockCatatan: document.getElementById('lockCatatan'),

    inspectorActionRow: document.getElementById('inspectorActionRow'),
    btnSaveParcel: document.getElementById('btnSaveParcel'),
    btnRevertParcel: document.getElementById('btnRevertParcel'),
    activityLogList: document.getElementById('activityLogList'),

    importModal: document.getElementById('importModal'),
    btnCloseImport: document.getElementById('btnCloseImport'),
    importDropzone: document.getElementById('importDropzone'),
    importFileInput: document.getElementById('importFileInput'),
    importFeedback: document.getElementById('importFeedback'),
    btnDownloadTemplateXlsx: document.getElementById('btnDownloadTemplateXlsx'),

    exportModal: document.getElementById('exportModal'),
    btnCloseExport: document.getElementById('btnCloseExport'),
    scopeFiltered: document.getElementById('scopeFiltered'),
    scopeAll: document.getElementById('scopeAll'),
    scopeFilteredCount: document.getElementById('scopeFilteredCount'),
    scopeAllCount: document.getElementById('scopeAllCount'),
    btnExecExportGeojson: document.getElementById('btnExecExportGeojson'),
    btnExecExportExcel: document.getElementById('btnExecExportExcel'),

    toastStack: document.getElementById('toastStack')
  };

  function showToast(message, type = 'info') {
    LStore.showToast(el.toastStack, message, type);
  }

  function addActivityLog(text) {
    state.logs = LStore.pushLog(state.session.name, state.session.table || state.role, 'Peta', text);
    renderActivityLogs();
  }

  function renderActivityLogs() {
    if (!state.logs.length) {
      el.activityLogList.innerHTML = '<div style="font-size:11px; color: var(--text-muted); padding: 6px 0;">Belum ada aktivitas tercatat di database.</div>';
      return;
    }
    el.activityLogList.innerHTML = state.logs.slice(0, 6).map(item => `
      <div class="log-item">
        <div class="log-item-head">
          <span class="mono" style="color: var(--accent-cyan);">${escapeHtml(item.actor)}</span>
          <span class="mono">${escapeHtml(item.time)}</span>
        </div>
        <div style="color: var(--text-primary);">${escapeHtml(item.text)}</div>
      </div>
    `).join('');
  }

  // =========================================================================
  // LEAFLET MAP INITIALIZATION & LAYER MANAGEMENT
  // =========================================================================
  const map = L.map('map', {
    center: [state.projectCfg.centerLat || -6.5458, state.projectCfg.centerLng || 107.7232],
    zoom: 14,
    zoomControl: true,
    preferCanvas: false
  });

  const basemaps = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 20
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    })
  };

  let activeBasemapLayer = basemaps.dark;
  activeBasemapLayer.addTo(map);

  const rowLayerGroup = L.layerGroup().addTo(map);
  const parcelsLayerGroup = L.layerGroup().addTo(map);
  const labelsLayerGroup = L.layerGroup().addTo(map);
  const parcelLayerMap = new Map();

  function renderRowLayer() {
    rowLayerGroup.clearLayers();
    if (!state.rowFeatures.length) return;

    state.rowFeatures.forEach(feat => {
      const isPoly = feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon');
      L.geoJSON(feat, {
        interactive: false,
        style: isPoly
          ? { color: '#22d3ee', weight: 1.5, dashArray: '6, 5', fillColor: '#06b6d4', fillOpacity: 0.08 }
          : { color: '#22d3ee', weight: 2.5, dashArray: '10, 6', opacity: 0.92 }
      }).addTo(rowLayerGroup);
    });
  }

  map.on('mousemove', e => {
    el.coordTelemetry.textContent = `LAT ${e.latlng.lat.toFixed(5)} | LNG ${e.latlng.lng.toFixed(5)}`;
  });

  function getParcelStyle(feature, isSelected) {
    const st = STATUS_CONFIG[feature.properties.status] || STATUS_CONFIG['Belum Diproses'];
    if (isSelected) {
      return {
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillColor: st.color,
        fillOpacity: Math.min(0.8, st.fillOpacity + 0.25)
      };
    }
    return {
      color: st.color,
      weight: 1.5,
      opacity: 0.95,
      fillColor: st.color,
      fillOpacity: st.fillOpacity
    };
  }

  function renderMapLayers(filteredParcels) {
    parcelsLayerGroup.clearLayers();
    labelsLayerGroup.clearLayers();
    parcelLayerMap.clear();

    filteredParcels.forEach(feature => {
      const p = feature.properties;
      const isSelected = p.id_bidang === state.selectedId;

      const geoLayer = L.geoJSON(feature, {
        style: () => getParcelStyle(feature, isSelected),
        onEachFeature: (_feat, layer) => {
          const tipHtml = `
            <div style="font-weight:700; color:#67e8f9; font-family:'JetBrains Mono',monospace;">${escapeHtml(p.id_bidang)}</div>
            <div>${escapeHtml(p.nama_pemilik)}</div>
            <div style="color:#94a3b8; font-size:10px;">${escapeHtml(p.desa)} • ${formatNumberID(p.luas_m2)} m²</div>
            <div style="margin-top:2px; font-weight:600; color:${(STATUS_CONFIG[p.status] || STATUS_CONFIG['Belum Diproses']).color};">${escapeHtml(p.status)} (${p.progres}%)</div>
          `;
          layer.bindTooltip(tipHtml, {
            sticky: true,
            direction: 'top',
            className: 'parcel-hover-tip',
            opacity: 0.96
          });

          layer.on({
            mouseover: e => {
              if (p.id_bidang !== state.selectedId) {
                e.target.setStyle({ weight: 2.5, fillOpacity: 0.7 });
              }
            },
            mouseout: e => {
              e.target.setStyle(getParcelStyle(feature, p.id_bidang === state.selectedId));
            },
            click: e => {
              L.DomEvent.stopPropagation(e);
              selectParcel(p.id_bidang, false);
            }
          });

          parcelLayerMap.set(p.id_bidang, layer);
        }
      });

      geoLayer.addTo(parcelsLayerGroup);
      if (isSelected) {
        geoLayer.bringToFront();
      }

      const centroid = getGeometryCentroid(feature.geometry);
      L.marker(centroid, {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<div class="parcel-id-label">${escapeHtml(p.id_bidang)}</div>`,
          iconSize: [0, 0]
        })
      }).addTo(labelsLayerGroup);
    });

    syncLayerVisibility();
  }

  function syncLayerVisibility() {
    if (state.layers.showParcels) {
      if (!map.hasLayer(parcelsLayerGroup)) map.addLayer(parcelsLayerGroup);
    } else if (map.hasLayer(parcelsLayerGroup)) {
      map.removeLayer(parcelsLayerGroup);
    }

    if (state.layers.showRow) {
      if (!map.hasLayer(rowLayerGroup)) map.addLayer(rowLayerGroup);
    } else if (map.hasLayer(rowLayerGroup)) {
      map.removeLayer(rowLayerGroup);
    }

    if (state.layers.showLabels && state.layers.showParcels) {
      if (!map.hasLayer(labelsLayerGroup)) map.addLayer(labelsLayerGroup);
    } else if (map.hasLayer(labelsLayerGroup)) {
      map.removeLayer(labelsLayerGroup);
    }
  }

  function zoomToParcel(idBidang) {
    const layer = parcelLayerMap.get(idBidang);
    if (layer && layer.getBounds) {
      map.fitBounds(layer.getBounds(), { padding: [55, 55], maxZoom: 18, animate: true });
    } else {
      const parcel = state.parcels.find(f => f.properties.id_bidang === idBidang);
      if (parcel) {
        const tempBounds = L.geoJSON(parcel).getBounds();
        if (tempBounds.isValid()) {
          map.fitBounds(tempBounds, { padding: [55, 55], maxZoom: 18, animate: true });
        }
      }
    }
  }

  function fitAllVisibleParcels(silent = false) {
    const list = getFilteredParcels();
    if (!list.length) {
      if (!silent) {
        showToast('Belum ada data persil di database. Tambahkan manual di Kelola / Admin atau Import GeoJSON/SHP.', 'info');
      }
      return;
    }
    const group = L.featureGroup(list.map(f => L.geoJSON(f)));
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36], animate: true });
    }
  }

  function fitRowLayer() {
    if (!state.rowFeatures.length) {
      showToast('Belum ada layer Trase ROW di database. Import file GeoJSON ROW di halaman Kelola / Admin.', 'info');
      return;
    }
    const group = L.featureGroup(state.rowFeatures.map(f => L.geoJSON(f)));
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36], animate: true });
    }
  }

  // =========================================================================
  // CHART.JS DOUGHNUT & KPI ENGINE
  // =========================================================================
  const chartCtx = document.getElementById('statusChart').getContext('2d');
  const statusChart = new Chart(chartCtx, {
    type: 'doughnut',
    data: {
      labels: STATUS_ORDER,
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: STATUS_ORDER.map(s => STATUS_CONFIG[s].color),
        borderColor: '#09101d',
        borderWidth: 2,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      animation: { duration: 260 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(8, 13, 24, 0.95)',
          borderColor: 'rgba(6, 182, 212, 0.6)',
          borderWidth: 1,
          cornerRadius: 2,
          padding: 8,
          titleFont: { family: 'Inter', size: 11, weight: '700' },
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
              const pct = ((ctx.parsed / total) * 100).toFixed(1).replace('.', ',');
              return ` ${ctx.parsed} bidang (${pct}%)`;
            }
          }
        }
      },
      onClick: (_evt, elements) => {
        if (elements && elements.length > 0) {
          const clickedStatus = STATUS_ORDER[elements[0].index];
          toggleStatusQuickFilter(clickedStatus);
        }
      }
    }
  });

  function toggleStatusQuickFilter(statusName) {
    state.filters.status = state.filters.status === statusName ? 'ALL' : statusName;
    el.filterStatus.value = state.filters.status;
    syncAll();
  }

  function renderKpiAndChart(filteredParcels) {
    const totalAll = state.parcels.length;
    const count = filteredParcels.length;

    let totalLuas = 0;
    let bebasLuas = 0;
    let bebasCount = 0;
    let totalUgr = 0;
    const statusCounts = {};
    STATUS_ORDER.forEach(s => { statusCounts[s] = 0; });

    filteredParcels.forEach(f => {
      const p = f.properties;
      const area = Number(p.luas_m2) || 0;
      const ugr = Number(p.nilai_ugr) || 0;
      totalLuas += area;
      totalUgr += ugr;
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++;
      } else {
        statusCounts['Belum Diproses']++;
      }
      if (p.status === 'Bebas/Lunas') {
        bebasLuas += area;
        bebasCount++;
      }
    });

    const totalHa = totalLuas / 10000;
    const bebasHa = bebasLuas / 10000;
    const bebasPct = totalLuas > 0 ? (bebasLuas / totalLuas) * 100 : 0;

    el.kpiScopeBadge.textContent = `${count} / ${totalAll} PERSIL`;
    el.kpiTotalPersil.textContent = formatNumberID(count);
    el.kpiTotalPersilSub.textContent = count === totalAll
      ? `${bebasCount} bidang sudah lunas`
      : `terfilter dari ${totalAll} bidang`;

    el.kpiTotalLuas.textContent = `${formatNumberID(totalLuas)} m²`;
    el.kpiTotalHa.textContent = `${formatNumberID(totalHa, 2)} Ha`;

    el.kpiBebasPct.textContent = `${formatNumberID(bebasPct, 1)}%`;
    el.kpiBebasLuas.textContent = `${formatNumberID(bebasLuas)} m² (${formatNumberID(bebasHa, 2)} Ha)`;
    el.kpiBebasBar.style.width = `${Math.min(100, bebasPct).toFixed(1)}%`;

    el.kpiTotalUgr.textContent = formatCompactIDR(totalUgr);
    el.kpiTotalUgrExact.textContent = formatCurrencyIDR(totalUgr);
    el.kpiTotalUgrExact.title = formatCurrencyIDR(totalUgr);

    el.chartCenterPct.textContent = `${formatNumberID(bebasPct, 0)}%`;

    statusChart.data.datasets[0].data = STATUS_ORDER.map(s => statusCounts[s]);
    statusChart.update();

    el.chartLegendList.innerHTML = STATUS_ORDER.map(st => {
      const cfg = STATUS_CONFIG[st];
      const isActive = state.filters.status === st;
      return `
        <div class="chart-legend-item ${isActive ? 'active-filter' : ''}" data-status="${escapeHtml(st)}" title="Klik untuk filter status ${escapeHtml(st)}">
          <div class="legend-left">
            <span class="swatch" style="background: ${cfg.color};"></span>
            <span class="legend-name">${escapeHtml(cfg.shortLabel)}</span>
          </div>
          <span class="legend-count mono">${statusCounts[st]}</span>
        </div>
      `;
    }).join('');

    el.mapLegendRows.innerHTML = STATUS_ORDER.map(st => {
      const cfg = STATUS_CONFIG[st];
      return `
        <div class="legend-row-item">
          <span class="swatch" style="background: ${cfg.color};"></span>
          <span style="flex:1; color: var(--text-secondary);">${escapeHtml(st)}</span>
          <span class="mono" style="font-weight:600;">${statusCounts[st]}</span>
        </div>
      `;
    }).join('') + `
      <div class="legend-row-item" style="margin-top:3px; padding-top:4px; border-top: 1px solid var(--border-subtle);">
        <span class="row-line-sample"></span>
        <span style="color: #67e8f9;">Trase Rencana (ROW)</span>
      </div>
    `;
  }

  // =========================================================================
  // FILTERING, SORTING & ATTRIBUTE TABLE
  // =========================================================================
  function refreshFilterControlsMetadata() {
    const uniqueDesa = Array.from(new Set(state.parcels.map(f => f.properties.desa))).sort((a, b) => a.localeCompare(b, 'id'));
    const prevDesa = state.filters.desa;
    el.filterDesa.innerHTML = '<option value="ALL">Semua Wilayah</option>' +
      uniqueDesa.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    if (uniqueDesa.includes(prevDesa)) {
      el.filterDesa.value = prevDesa;
    } else {
      state.filters.desa = 'ALL';
      el.filterDesa.value = 'ALL';
    }

    const maxArea = state.parcels.reduce((mx, f) => Math.max(mx, Number(f.properties.luas_m2) || 0), 1000);
    const niceMax = Math.ceil(maxArea / 500) * 500;
    el.filterMinArea.max = niceMax;
    el.filterMinArea.step = niceMax > 20000 ? 500 : 100;
    if (state.filters.minArea > niceMax) {
      state.filters.minArea = 0;
      el.filterMinArea.value = 0;
      el.filterMinAreaVal.textContent = '0 m²';
    }
  }

  function getFilteredParcels() {
    const q = state.filters.search.trim().toLowerCase();
    const st = state.filters.status;
    const desa = state.filters.desa;
    const minArea = Number(state.filters.minArea) || 0;

    return state.parcels.filter(f => {
      const p = f.properties;
      if (st !== 'ALL' && p.status !== st) return false;
      if (desa !== 'ALL' && p.desa !== desa) return false;
      if ((Number(p.luas_m2) || 0) < minArea) return false;
      if (q) {
        const hay = `${p.id_bidang} ${p.nama_pemilik} ${p.desa}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sortParcels(list) {
    const { field, dir } = state.sort;
    const mul = dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a.properties[field];
      const vb = b.properties[field];
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * mul;
      }
      return String(va ?? '').localeCompare(String(vb ?? ''), 'id', { numeric: true }) * mul;
    });
  }

  function renderAttributeTable(filteredParcels) {
    const sorted = sortParcels(filteredParcels);
    el.tableCountBadge.textContent = `${sorted.length} PERSIL`;

    if (!state.parcels.length) {
      const adminHint = state.role === 'admin'
        ? 'Tambah manual di halaman <a href="admin.html" style="color:#67e8f9; font-weight:600;">Kelola / Admin</a> atau gunakan tombol <strong>Import</strong> di atas.'
        : 'Hubungi Administrator untuk menginput atau mengimport data persil.';
      el.attrTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding: 24px; color: var(--text-secondary);">
            Database persil masih kosong (tanpa dummy). ${adminHint}
          </td>
        </tr>
      `;
      return;
    }

    if (!sorted.length) {
      el.attrTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding: 22px; color: var(--text-muted);">
            Tidak ada persil yang sesuai dengan kriteria pencarian atau filter aktif.
          </td>
        </tr>
      `;
      return;
    }

    el.attrTableBody.innerHTML = sorted.map(f => {
      const p = f.properties;
      const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['Belum Diproses'];
      const isSelected = p.id_bidang === state.selectedId;
      return `
        <tr data-id="${escapeHtml(p.id_bidang)}" class="${isSelected ? 'selected-row' : ''}">
          <td class="mono" style="font-weight:700; color:#67e8f9;">${escapeHtml(p.id_bidang)}</td>
          <td>${escapeHtml(p.nama_pemilik)}</td>
          <td style="color:var(--text-secondary);">${escapeHtml(p.desa)}</td>
          <td class="mono">${formatNumberID(p.luas_m2)}</td>
          <td class="mono">${formatCurrencyIDR(p.nilai_ugr)}</td>
          <td>
            <span class="status-badge ${cfg.badgeClass}">
              <span class="swatch" style="background:${cfg.color}; width:6px; height:6px;"></span>
              ${escapeHtml(p.status)}
            </span>
          </td>
          <td>
            <div class="mini-prog-wrap">
              <div class="mini-prog-bar">
                <div class="mini-prog-fill" style="width:${p.progres}%; background:${cfg.color};"></div>
              </div>
              <span class="mono" style="font-size:10.5px;">${p.progres}%</span>
            </div>
          </td>
          <td style="color:var(--text-secondary);" title="${escapeHtml(p.catatan)}">${escapeHtml(p.catatan)}</td>
          <td style="text-align:center;">
            <button type="button" class="btn btn-sm btn-zoom-row" data-id="${escapeHtml(p.id_bidang)}" title="Zoom ke persil" style="height:22px; padding:0 6px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // INSPECTOR PANEL & REAL-TIME RBAC EDITING
  // =========================================================================
  function selectParcel(idBidang, shouldZoom = false) {
    const parcel = state.parcels.find(f => f.properties.id_bidang === idBidang);
    if (!parcel) {
      state.selectedId = null;
      state.parcelSnapshotBeforeEdit = null;
      renderInspector();
      return;
    }
    state.selectedId = idBidang;
    state.parcelSnapshotBeforeEdit = { ...parcel.properties };

    parcelLayerMap.forEach((layer, key) => {
      const feat = state.parcels.find(f => f.properties.id_bidang === key);
      if (feat) {
        layer.setStyle(getParcelStyle(feat, key === idBidang));
        if (key === idBidang && layer.bringToFront) layer.bringToFront();
      }
    });

    const rows = el.attrTableBody.querySelectorAll('tr[data-id]');
    rows.forEach(tr => {
      const match = tr.getAttribute('data-id') === idBidang;
      tr.classList.toggle('selected-row', match);
      if (match && !shouldZoom) {
        tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    renderInspector();

    if (window.innerWidth <= 980) {
      el.sidebarRight.classList.add('drawer-open');
      el.sidebarLeft.classList.remove('drawer-open');
    }

    if (shouldZoom) {
      zoomToParcel(idBidang);
    }
  }

  function renderInspector() {
    const parcel = state.parcels.find(f => f.properties.id_bidang === state.selectedId);
    if (!parcel) {
      el.inspectorEmpty.style.display = 'flex';
      el.inspectorForm.style.display = 'none';
      return;
    }

    el.inspectorEmpty.style.display = 'none';
    el.inspectorForm.style.display = 'flex';

    const p = parcel.properties;
    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['Belum Diproses'];
    const [cLat, cLng] = getGeometryCentroid(parcel.geometry);

    el.inspIdTitle.textContent = p.id_bidang;
    el.inspStatusBadge.className = `status-badge ${cfg.badgeClass}`;
    el.inspStatusBadge.textContent = p.status;
    el.inspCoord.textContent = `${cLat.toFixed(5)}, ${cLng.toFixed(5)}`;
    el.inspHa.textContent = `${formatNumberID((p.luas_m2 || 0) / 10000, 4)} Ha`;

    el.editIdBidang.value = p.id_bidang;
    el.editPemilik.value = p.nama_pemilik;
    el.editDesa.value = p.desa;
    el.editLuas.value = p.luas_m2;
    el.editUgr.value = p.nilai_ugr;
    el.editUgrFormatted.textContent = formatCurrencyIDR(p.nilai_ugr);
    el.editStatus.value = p.status;
    el.editProgresRange.value = p.progres;
    el.editProgresNum.value = p.progres;
    el.editProgresText.textContent = `${p.progres}%`;
    el.editCatatan.value = p.catatan;

    applyRbacToInspectorFields();
  }

  function applyRbacToInspectorFields() {
    const perm = RBAC_ROLES[state.role];

    el.editPemilik.disabled = !perm.canEditCore;
    el.editDesa.disabled = !perm.canEditCore;
    el.editLuas.disabled = !perm.canEditCore;
    el.editUgr.disabled = !perm.canEditCore;

    el.lockPemilik.style.display = perm.canEditCore ? 'none' : 'inline-flex';
    el.lockDesa.style.display = perm.canEditCore ? 'none' : 'inline-flex';
    el.lockLuas.style.display = perm.canEditCore ? 'none' : 'inline-flex';
    el.lockUgr.style.display = perm.canEditCore ? 'none' : 'inline-flex';

    el.editStatus.disabled = !perm.canEditField;
    el.editProgresRange.disabled = !perm.canEditField;
    el.editProgresNum.disabled = !perm.canEditField;
    el.editCatatan.disabled = !perm.canEditField;

    el.lockStatus.style.display = perm.canEditField ? 'none' : 'inline-flex';
    el.lockCatatan.style.display = perm.canEditField ? 'none' : 'inline-flex';

    el.inspectorActionRow.style.display = perm.canEditField ? 'grid' : 'none';
  }

  function applyLiveParcelEdit(sourceField) {
    const perm = RBAC_ROLES[state.role];
    if (!perm.canEditField) return;
    const parcel = state.parcels.find(f => f.properties.id_bidang === state.selectedId);
    if (!parcel) return;

    const p = parcel.properties;

    if (perm.canEditCore) {
      p.nama_pemilik = el.editPemilik.value.trim() || 'Tanpa Nama';
      p.desa = el.editDesa.value.trim() || 'Wilayah Umum';
      const newLuas = parseInt(el.editLuas.value, 10);
      if (Number.isFinite(newLuas) && newLuas > 0) p.luas_m2 = newLuas;
      const newUgr = parseInt(el.editUgr.value, 10);
      if (Number.isFinite(newUgr) && newUgr >= 0) p.nilai_ugr = newUgr;
    }

    const newStatus = el.editStatus.value;
    if (STATUS_CONFIG[newStatus]) {
      p.status = newStatus;
      if (sourceField === 'status' && newStatus === 'Bebas/Lunas') {
        p.progres = 100;
        el.editProgresRange.value = 100;
        el.editProgresNum.value = 100;
      }
    }

    const progSource = sourceField === 'progresNum' ? el.editProgresNum.value : el.editProgresRange.value;
    const progVal = Math.max(0, Math.min(100, parseInt(progSource, 10) || 0));
    p.progres = progVal;
    el.editProgresRange.value = progVal;
    el.editProgresNum.value = progVal;
    el.editProgresText.textContent = `${progVal}%`;

    p.catatan = el.editCatatan.value;

    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['Belum Diproses'];
    el.inspStatusBadge.className = `status-badge ${cfg.badgeClass}`;
    el.inspStatusBadge.textContent = p.status;
    el.inspHa.textContent = `${formatNumberID((p.luas_m2 || 0) / 10000, 4)} Ha`;
    el.editUgrFormatted.textContent = formatCurrencyIDR(p.nilai_ugr);

    LStore.saveParcels(state.parcels);

    if (sourceField === 'desa') {
      refreshFilterControlsMetadata();
    }
    syncAll({ keepInspectorInputs: true });
  }

  function applyRoleUI() {
    const perm = RBAC_ROLES[state.role];
    el.roleSelect.value = state.role;
    el.roleSelect.disabled = state.originRole !== 'admin';
    el.roleSelect.title = state.originRole === 'admin'
      ? 'Simulasi Tampilan Role RBAC'
      : `Role terkunci sesuai akun database (${RBAC_ROLES[state.originRole].label})`;
    el.roleDot.style.background = perm.color;

    el.rbacBanner.className = `rbac-banner ${perm.bannerClass}`;
    el.rbacBannerIconWrap.innerHTML = `<i data-lucide="${perm.icon}" width="16" height="16" style="color: ${perm.color};"></i>`;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    el.rbacBannerTitle.textContent = perm.label;
    el.rbacBannerDesc.textContent = perm.desc;

    el.btnOpenImport.disabled = !perm.canImport;
    el.btnOpenImport.title = perm.canImport
      ? 'Import GeoJSON, Shapefile (.zip), atau Excel (.xlsx)'
      : 'Terkunci: Hanya Admin / Koordinator yang dapat mengimport dataset';

    el.navAdminTab.classList.toggle('locked-tab', !perm.canAccessAdmin);
    el.navAdminTab.title = perm.canAccessAdmin
      ? 'Buka Konsol Kelola / Admin'
      : 'Khusus Admin / Koordinator';

    applyRbacToInspectorFields();
  }

  // =========================================================================
  // REACTIVE SYNC PIPELINE
  // =========================================================================
  function syncAll(opts = {}) {
    const filtered = getFilteredParcels();

    const hasActiveFilter = Boolean(
      state.filters.search.trim() ||
      state.filters.status !== 'ALL' ||
      state.filters.desa !== 'ALL' ||
      state.filters.minArea > 0
    );

    el.filterCountText.textContent = `${filtered.length} / ${state.parcels.length}`;
    el.activeFilterNote.textContent = hasActiveFilter ? 'Filter aktif' : 'Semua data aktif';
    el.activeFilterNote.style.color = hasActiveFilter ? '#fbbf24' : 'var(--accent-cyan)';

    renderKpiAndChart(filtered);
    renderMapLayers(filtered);
    renderAttributeTable(filtered);

    if (!opts.keepInspectorInputs) {
      renderInspector();
    }
  }

  // =========================================================================
  // EXPORT & IMPORT HANDLERS
  // =========================================================================
  function getExportTargetParcels() {
    return state.exportScope === 'all' ? state.parcels : getFilteredParcels();
  }

  function updateExportScopeCounts() {
    el.scopeFilteredCount.textContent = `${getFilteredParcels().length} Persil`;
    el.scopeAllCount.textContent = `${state.parcels.length} Persil`;
  }

  function handleExportGeoJSON() {
    const features = getExportTargetParcels();
    if (!features.length) {
      showToast('Tidak ada data persil untuk diexport.', 'warn');
      return;
    }
    const suffix = state.exportScope === 'all' ? 'all' : 'filtered';
    LStore.exportFeaturesToGeoJSON(features, suffix);
    showToast(`Berhasil export ${features.length} persil ke GeoJSON.`, 'success');
    addActivityLog(`Export GeoJSON (${features.length} persil).`);
    el.exportModal.classList.remove('open');
  }

  function handleExportExcel() {
    const features = getExportTargetParcels();
    if (!features.length) {
      showToast('Tidak ada data persil untuk diexport.', 'warn');
      return;
    }
    try {
      const suffix = state.exportScope === 'all' ? 'all' : 'filtered';
      const scopeLabel = state.exportScope === 'all' ? 'Seluruh Dataset' : 'Hasil Filter Aktif';
      LStore.exportFeaturesToExcel(features, scopeLabel, RBAC_ROLES[state.role].label, suffix);
      showToast(`Laporan Excel (${features.length} persil) berhasil diunduh.`, 'success');
      addActivityLog(`Export Excel (${features.length} persil).`);
      el.exportModal.classList.remove('open');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function setImportFeedback(html, isError = false) {
    el.importFeedback.style.display = 'block';
    el.importFeedback.style.borderColor = isError ? 'var(--st-sengketa)' : 'var(--st-bebas)';
    el.importFeedback.innerHTML = html;
  }

  async function handleImportFile(file) {
    if (!RBAC_ROLES[state.role].canImport) {
      showToast('Akses ditolak: hanya Admin / Koordinator yang dapat mengimport data.', 'error');
      return;
    }
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        setImportFeedback('Memproses arsip Shapefile (.zip)...');
      }
      const result = await LStore.parseUploadedDatasetFile(file, state.parcels);
      state.parcels = result.parcels;
      LStore.saveParcels(state.parcels);

      if (result.mode === 'replace') {
        state.selectedId = null;
        state.parcelSnapshotBeforeEdit = null;
        state.filters = { search: '', status: 'ALL', desa: 'ALL', minArea: 0 };
        el.searchInput.value = '';
        el.btnClearSearch.style.display = 'none';
        el.filterStatus.value = 'ALL';
        el.filterMinArea.value = 0;
        el.filterMinAreaVal.textContent = '0 m²';
        refreshFilterControlsMetadata();
        syncAll();
        fitAllVisibleParcels(true);
        setImportFeedback(
          `<strong style="color:#34d399;">Import ${escapeHtml(result.sourceLabel)} berhasil!</strong><br/>Memuat <strong>${result.parcels.length} bidang persil</strong> ke peta & database.`
        );
        showToast(`Dataset diperbarui: ${result.parcels.length} persil dari ${result.sourceLabel}.`, 'success');
        addActivityLog(`Import ${result.sourceLabel}: muat ${result.parcels.length} persil.`);
      } else {
        refreshFilterControlsMetadata();
        syncAll();
        const msg = `Berhasil memperbarui <strong>${result.updatedCount} persil</strong> dari Excel.${result.unmatchedCount ? ` (${result.unmatchedCount} ID tidak ditemukan di peta).` : ''}`;
        setImportFeedback(`<span style="color:#34d399;">${msg}</span>`);
        showToast(`Excel import: ${result.updatedCount} persil diperbarui.`, 'success');
        addActivityLog(`Import Excel: update atribut ${result.updatedCount} persil.`);
      }
    } catch (err) {
      console.error(err);
      setImportFeedback(`<strong style="color:#f87171;">Gagal Import:</strong> ${escapeHtml(err.message)}`, true);
      showToast(err.message, 'error');
    } finally {
      el.importFileInput.value = '';
    }
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  el.roleSelect.addEventListener('change', () => {
    if (state.originRole !== 'admin') return;
    state.role = el.roleSelect.value;
    state.session.role = state.role;
    LStore.saveSession(state.session);
    applyRoleUI();
    showToast(`Mode pratinjau role diubah ke: ${RBAC_ROLES[state.role].label}`, 'info');
    addActivityLog(`Switch pratinjau role -> ${RBAC_ROLES[state.role].label}.`);
  });

  el.btnLogout.addEventListener('click', () => {
    LStore.pushLog(state.session.name, state.session.table || state.role, 'Peta', 'Keluar dari sesi WebGIS.');
    LStore.clearSession();
    window.location.href = 'index.html';
  });

  el.btnToggleLeft.addEventListener('click', () => {
    el.sidebarLeft.classList.toggle('drawer-open');
    el.sidebarRight.classList.remove('drawer-open');
  });
  el.btnToggleRight.addEventListener('click', () => {
    el.sidebarRight.classList.toggle('drawer-open');
    el.sidebarLeft.classList.remove('drawer-open');
  });
  el.btnCloseInspectorMobile.addEventListener('click', () => {
    el.sidebarRight.classList.remove('drawer-open');
  });

  el.searchInput.addEventListener('input', () => {
    state.filters.search = el.searchInput.value;
    el.btnClearSearch.style.display = el.searchInput.value ? 'flex' : 'none';
    syncAll();
  });

  el.btnClearSearch.addEventListener('click', () => {
    el.searchInput.value = '';
    state.filters.search = '';
    el.btnClearSearch.style.display = 'none';
    syncAll();
  });

  el.filterStatus.addEventListener('change', () => {
    state.filters.status = el.filterStatus.value;
    syncAll();
  });

  el.filterDesa.addEventListener('change', () => {
    state.filters.desa = el.filterDesa.value;
    syncAll();
  });

  el.filterMinArea.addEventListener('input', () => {
    state.filters.minArea = Number(el.filterMinArea.value) || 0;
    el.filterMinAreaVal.textContent = `${formatNumberID(state.filters.minArea)} m²`;
    syncAll();
  });

  el.btnResetFilters.addEventListener('click', () => {
    state.filters = { search: '', status: 'ALL', desa: 'ALL', minArea: 0 };
    el.searchInput.value = '';
    el.btnClearSearch.style.display = 'none';
    el.filterStatus.value = 'ALL';
    el.filterDesa.value = 'ALL';
    el.filterMinArea.value = 0;
    el.filterMinAreaVal.textContent = '0 m²';
    syncAll();
  });

  el.chartLegendList.addEventListener('click', evt => {
    const item = evt.target.closest('.chart-legend-item');
    if (!item) return;
    const st = item.getAttribute('data-status');
    if (st) toggleStatusQuickFilter(st);
  });

  el.mapCtrlToggle.addEventListener('click', () => {
    el.mapCtrlPanel.classList.toggle('collapsed');
  });

  document.querySelectorAll('.bm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-basemap');
      if (!basemaps[target] || state.layers.basemap === target) return;
      map.removeLayer(activeBasemapLayer);
      activeBasemapLayer = basemaps[target];
      activeBasemapLayer.addTo(map);
      state.layers.basemap = target;
      document.querySelectorAll('.bm-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  el.toggleParcels.addEventListener('change', () => {
    state.layers.showParcels = el.toggleParcels.checked;
    syncLayerVisibility();
  });
  el.toggleRow.addEventListener('change', () => {
    state.layers.showRow = el.toggleRow.checked;
    syncLayerVisibility();
  });
  el.toggleLabels.addEventListener('change', () => {
    state.layers.showLabels = el.toggleLabels.checked;
    syncLayerVisibility();
  });

  el.btnFitAll.addEventListener('click', () => fitAllVisibleParcels(false));
  el.btnFitRow.addEventListener('click', fitRowLayer);

  function toggleAttrDrawer() {
    state.tableCollapsed = !state.tableCollapsed;
    el.attrDrawer.classList.toggle('collapsed', state.tableCollapsed);
    el.tableToggleLabel.textContent = state.tableCollapsed ? 'Expand' : 'Collapse';
    setTimeout(() => map.invalidateSize(), 230);
  }

  el.attrDrawerHead.addEventListener('click', () => toggleAttrDrawer());

  document.querySelectorAll('.attr-table thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (state.sort.field === field) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.field = field;
        state.sort.dir = 'asc';
      }
      renderAttributeTable(getFilteredParcels());
    });
  });

  el.attrTableBody.addEventListener('click', evt => {
    const zoomBtn = evt.target.closest('.btn-zoom-row');
    const tr = evt.target.closest('tr[data-id]');
    if (!tr) return;
    const id = (zoomBtn ? zoomBtn.getAttribute('data-id') : tr.getAttribute('data-id'));
    if (id) selectParcel(id, true);
  });

  el.editPemilik.addEventListener('input', () => applyLiveParcelEdit('pemilik'));
  el.editDesa.addEventListener('input', () => applyLiveParcelEdit('desa'));
  el.editLuas.addEventListener('input', () => applyLiveParcelEdit('luas'));
  el.editUgr.addEventListener('input', () => applyLiveParcelEdit('ugr'));
  el.editStatus.addEventListener('change', () => applyLiveParcelEdit('status'));
  el.editProgresRange.addEventListener('input', () => applyLiveParcelEdit('progresRange'));
  el.editProgresNum.addEventListener('input', () => applyLiveParcelEdit('progresNum'));
  el.editCatatan.addEventListener('input', () => applyLiveParcelEdit('catatan'));

  el.btnZoomSelected.addEventListener('click', () => {
    if (state.selectedId) zoomToParcel(state.selectedId);
  });

  el.btnClearSelection.addEventListener('click', () => {
    selectParcel(null);
    syncAll();
  });

  el.inspectorForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!RBAC_ROLES[state.role].canEditField) {
      showToast('Mode Viewer (Read-Only) tidak diizinkan mengubah data.', 'error');
      return;
    }
    const parcel = state.parcels.find(f => f.properties.id_bidang === state.selectedId);
    if (!parcel) return;
    state.parcelSnapshotBeforeEdit = { ...parcel.properties };
    LStore.saveParcels(state.parcels);
    showToast(`Perubahan pada ${parcel.properties.id_bidang} (${parcel.properties.status}) tersimpan.`, 'success');
    addActivityLog(`Update ${parcel.properties.id_bidang}: ${parcel.properties.status} (${parcel.properties.progres}%).`);
  });

  el.btnRevertParcel.addEventListener('click', () => {
    if (!state.selectedId || !state.parcelSnapshotBeforeEdit) return;
    const parcel = state.parcels.find(f => f.properties.id_bidang === state.selectedId);
    if (!parcel) return;
    parcel.properties = { ...state.parcelSnapshotBeforeEdit };
    LStore.saveParcels(state.parcels);
    refreshFilterControlsMetadata();
    syncAll();
    showToast(`Edit pada ${state.selectedId} dikembalikan ke kondisi awal.`, 'info');
  });

  el.btnRefreshDb.addEventListener('click', async () => {
    await LStore.initDb();
    state.projectCfg = LStore.loadProjectConfig();
    state.parcels = LStore.loadParcels();
    state.rowFeatures = LStore.loadRowFeatures();
    state.logs = LStore.loadLogs();
    el.projectSubtitle.textContent = `Sistem Informasi Geografis Pembebasan Lahan — ${state.projectCfg.name}`;
    renderRowLayer();
    refreshFilterControlsMetadata();
    renderActivityLogs();
    syncAll();
    fitAllVisibleParcels(true);
    showToast(`Data dimuat ulang dari database (${state.parcels.length} persil).`, 'info');
  });

  el.btnOpenImport.addEventListener('click', () => {
    if (!RBAC_ROLES[state.role].canImport) {
      showToast('Akses ditolak: Import hanya untuk Admin / Koordinator.', 'warn');
      return;
    }
    el.importFeedback.style.display = 'none';
    el.importModal.classList.add('open');
  });

  el.btnCloseImport.addEventListener('click', () => el.importModal.classList.remove('open'));
  el.importModal.addEventListener('click', e => {
    if (e.target === el.importModal) el.importModal.classList.remove('open');
  });

  el.importDropzone.addEventListener('click', () => el.importFileInput.click());
  el.importFileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
      handleImportFile(e.target.files[0]);
    }
  });

  el.importDropzone.addEventListener('dragover', e => {
    e.preventDefault();
    el.importDropzone.classList.add('dragover');
  });
  el.importDropzone.addEventListener('dragleave', () => {
    el.importDropzone.classList.remove('dragover');
  });
  el.importDropzone.addEventListener('drop', e => {
    e.preventDefault();
    el.importDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportFile(e.dataTransfer.files[0]);
    }
  });

  el.btnDownloadTemplateXlsx.addEventListener('click', () => {
    try {
      LStore.downloadExcelTemplate(state.parcels);
      showToast('Template Excel (.xlsx) berhasil diunduh.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  el.btnOpenExport.addEventListener('click', () => {
    updateExportScopeCounts();
    el.exportModal.classList.add('open');
  });
  el.btnCloseExport.addEventListener('click', () => el.exportModal.classList.remove('open'));
  el.exportModal.addEventListener('click', e => {
    if (e.target === el.exportModal) el.exportModal.classList.remove('open');
  });

  [el.scopeFiltered, el.scopeAll].forEach(card => {
    card.addEventListener('click', () => {
      state.exportScope = card.getAttribute('data-scope');
      el.scopeFiltered.classList.toggle('active', state.exportScope === 'filtered');
      el.scopeAll.classList.toggle('active', state.exportScope === 'all');
    });
  });

  el.btnExecExportGeojson.addEventListener('click', handleExportGeoJSON);
  el.btnExecExportExcel.addEventListener('click', handleExportExcel);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      el.importModal.classList.remove('open');
      el.exportModal.classList.remove('open');
    }
  });

  // =========================================================================
  // INITIALIZE MAP PAGE
  // =========================================================================
  async function init() {
    await LStore.initDb();
    state.projectCfg = LStore.loadProjectConfig();
    state.parcels = LStore.loadParcels();
    state.rowFeatures = LStore.loadRowFeatures();
    state.logs = LStore.loadLogs();

    el.projectSubtitle.textContent = `Sistem Informasi Geografis Pembebasan Lahan — ${state.projectCfg.name}`;
    el.headerUserName.textContent = state.session.name;

    renderRowLayer();
    refreshFilterControlsMetadata();
    applyRoleUI();
    renderActivityLogs();
    syncAll();

    const params = new URLSearchParams(window.location.search);
    const focusId = params.get('focus');
    if (focusId && state.parcels.some(f => f.properties.id_bidang === focusId)) {
      selectParcel(focusId, true);
    } else if (state.parcels.length > 0) {
      fitAllVisibleParcels(true);
    } else if (state.rowFeatures.length > 0) {
      fitRowLayer();
    } else {
      map.setView([state.projectCfg.centerLat || -6.5458, state.projectCfg.centerLng || 107.7232], 14);
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  init();
})();
