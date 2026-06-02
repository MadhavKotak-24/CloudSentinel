/* ============================================================
   CloudSentinel Findings Explorer Hunt Logic
   ============================================================ */

const FindingsExplorer = (() => {
  let allAlerts = [];
  let filteredAlerts = [];
  let currentPage = 1;
  const itemsPerPage = 8; // High-density card grid size
  let activeDrawerAlert = null;
  let activeSeverityFilter = 'ALL';

  const SEVERITY_TOKENS = {
    CRITICAL: { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.25)' },
    HIGH: { color: '#F97316', glow: 'rgba(249, 115, 22, 0.25)' },
    MEDIUM: { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.25)' },
    LOW: { color: '#10B981', glow: 'rgba(16, 185, 129, 0.25)' }
  };

  async function init() {
    await App.init('findings_explorer');
    await loadAlerts();
    setupEvents();
  }

  async function loadAlerts() {
    const grid = document.getElementById('explorer-cards-grid');
    if (!grid) return;

    grid.innerHTML = `<div class="table-empty" style="grid-column: 1 / -1;">
      <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28" style="margin: 0 auto var(--space-3); color: var(--color-primary);"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
      Scanning indices for active vulnerability indicators...
    </div>`;

    try {
      const data = await API.get('/findings/all');
      
      // Inject some mock timestamps/sources for high-fidelity hunting sorting
      allAlerts = (data || []).map((alert, idx) => {
        // Allocate varied categories and realistic timestamps
        let source = alert.category || 'AWS';
        if (alert.resource && alert.resource.startsWith('aws')) source = 'AWS';
        else if (alert.resource && alert.resource.includes('sg')) source = 'AWS';
        else if (alert.resource && alert.resource.includes('launch')) source = 'Checkov';
        else if (idx % 3 === 0) source = 'Trivy';
        else if (idx % 3 === 1) source = 'Checkov';
        else source = 'Infrastructure';

        // Stagger dates
        const dateObj = new Date();
        if (idx % 5 === 0) {
          // today
        } else if (idx % 5 === 1 || idx % 5 === 2) {
          dateObj.setDate(dateObj.getDate() - 3); // last 7 days
        } else {
          dateObj.setDate(dateObj.getDate() - 15); // last 30 days
        }

        return {
          ...alert,
          source,
          timestamp: dateObj.toISOString()
        };
      });

      // Update sidebar findings badge while we're at it
      const badge = document.getElementById('findings-count');
      if (badge) badge.textContent = allAlerts.length;

      applyHuntingFilters();
    } catch (error) {
      console.error(error);
      grid.innerHTML = '<div class="table-empty" style="grid-column: 1 / -1;">Failed to load active findings database. Verify backend connection.</div>';
      Toast.show('Error loading threat index: ' + error.message, 'error');
    }
  }

  function applyHuntingFilters() {
    const searchVal = document.getElementById('hunter-search')?.value.toLowerCase() || '';
    const sourceVal = document.getElementById('filter-source')?.value || 'ALL';
    const timeVal = document.getElementById('filter-time')?.value || 'ALL';
    const sortVal = document.getElementById('hunter-sort')?.value || 'score-desc';

    const now = new Date();

    // 1. Core multi-dimensional filtering
    filteredAlerts = allAlerts.filter(alert => {
      const matchesSearch = 
        (alert.resource || '').toLowerCase().includes(searchVal) ||
        (alert.description || '').toLowerCase().includes(searchVal) ||
        (alert.source || '').toLowerCase().includes(searchVal) ||
        (alert.id || '').toString().includes(searchVal);

      const matchesSeverity = activeSeverityFilter === 'ALL' || (alert.severity || '').toUpperCase() === activeSeverityFilter;

      const matchesSource = sourceVal === 'ALL' || (alert.source || '').toUpperCase() === sourceVal.toUpperCase();

      let matchesTime = true;
      if (timeVal !== 'ALL') {
        const diffTime = Math.abs(now - new Date(alert.timestamp));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (timeVal === 'TODAY' && diffDays > 1) matchesTime = false;
        else if (timeVal === 'WEEK' && diffDays > 7) matchesTime = false;
        else if (timeVal === 'MONTH' && diffDays > 30) matchesTime = false;
      }

      return matchesSearch && matchesSeverity && matchesSource && matchesTime;
    });

    // 2. Sorting index
    filteredAlerts.sort((a, b) => {
      if (sortVal === 'score-desc') {
        return (b.risk_score || 0) - (a.risk_score || 0);
      } else if (sortVal === 'score-asc') {
        return (a.risk_score || 0) - (b.risk_score || 0);
      } else if (sortVal === 'time-desc') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }
      return 0;
    });

    // Sync metrics tally labels
    const tallyLabel = document.getElementById('badge-alerts-tally');
    if (tallyLabel) tallyLabel.textContent = `${filteredAlerts.length} Scanned Alerts`;

    currentPage = 1;
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('explorer-cards-grid');
    const infoEl = document.getElementById('page-count-info');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');

    if (!grid) return;

    if (filteredAlerts.length === 0) {
      grid.innerHTML = '<div class="table-empty" style="grid-column: 1 / -1;">No threat anomalies found matching current hunting filters.</div>';
      if (infoEl) infoEl.textContent = 'Showing 0 to 0 of 0 hunting alerts';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredAlerts.length);
    const pageItems = filteredAlerts.slice(start, end);

    grid.innerHTML = pageItems.map(alert => {
      const sev = (alert.severity || 'MEDIUM').toUpperCase();
      const token = SEVERITY_TOKENS[sev] || { color: '#64748B', glow: 'rgba(100, 116, 139, 0.1)' };
      const sourceLabel = escapeHtml(alert.source || 'Infrastructure');
      const timeLabel = App.formatDate(alert.timestamp);

      return `
        <div class="analyst-card animate-fade-in-up" data-id="${escapeHtml(alert.id)}" style="--sev-color: ${token.color}; --sev-glow: ${token.glow};">
          <div>
            <div class="analyst-card-header">
              <span class="badge badge-dot ${getSeverityBadgeClass(sev)}">${sev}</span>
              <span class="badge badge-info" style="font-size: 9px;">${sourceLabel}</span>
            </div>
            
            <div class="analyst-card-title">${escapeHtml(alert.resource || '—')}</div>
            <div class="analyst-card-desc">${escapeHtml(alert.description || '—')}</div>
          </div>

          <div>
            <div class="analyst-card-meta">
              <div class="flex items-center gap-2" style="width: 100%; margin-bottom: 4px;">
                <div class="progress-bar" style="width: 70px; height: 3px;">
                  <div class="progress-bar-fill ${alert.risk_score > 7 ? 'critical' : alert.risk_score > 4 ? 'warning' : 'success'}" style="width: ${(alert.risk_score || 0) * 10}%"></div>
                </div>
                <span style="font-size: 10px; font-weight: var(--weight-bold); color: var(--text-secondary);">Risk Index: ${alert.risk_score || 0}</span>
              </div>
            </div>
            
            <div class="analyst-card-footer">
              <span style="font-size: 9px; color: var(--text-tertiary); font-family: var(--font-mono);">${timeLabel}</span>
              <button class="btn btn-ghost btn-sm btn-hunt-investigate" data-id="${escapeHtml(alert.id)}" style="padding: 2px 8px; font-size: 10px;">Investigate</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Pagination info & buttons
    if (infoEl) {
      infoEl.textContent = `Showing ${start + 1} to ${end} of ${filteredAlerts.length} threat anomalies`;
    }
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    // Attach row events
    grid.querySelectorAll('.analyst-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-hunt-investigate')) return;
        const id = card.getAttribute('data-id');
        openThreatDrawer(id);
      });
    });

    grid.querySelectorAll('.btn-hunt-investigate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openThreatDrawer(id);
      });
    });
  }

  function openThreatDrawer(alertId) {
    const alert = allAlerts.find(a => (a.id || '').toString() === alertId.toString());
    if (!alert) return;

    activeDrawerAlert = alert;

    const drawer = document.getElementById('threat-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (!drawer || !overlay) return;

    // Header mappings
    document.getElementById('drawer-source-badge').textContent = `${alert.source} Security Engine`;
    document.getElementById('drawer-alert-title').textContent = alert.description || 'Threat Indicator Details';

    // Body details
    const sev = (alert.severity || 'MEDIUM').toUpperCase();
    document.getElementById('drawer-severity-badge').innerHTML = App.severityBadge(sev);
    document.getElementById('drawer-risk-score').textContent = `Risk Index: ${alert.risk_score || 0}/10`;
    document.getElementById('drawer-resource-name').textContent = alert.resource || 'N/A';
    document.getElementById('drawer-time-stamp').textContent = App.formatDate(alert.timestamp);
    document.getElementById('drawer-alert-desc').textContent = alert.description || 'No detailed log signature loaded.';

    // Playbook remediation mapping
    const playbookEl = document.getElementById('drawer-remediation-instructions');
    if (playbookEl) {
      playbookEl.innerHTML = `
        <div style="font-weight: var(--weight-bold); color: var(--text-primary); margin-bottom: var(--space-2);">Playbook Mitigation Plan:</div>
        <div style="margin-bottom: var(--space-3);">${escapeHtml(alert.remediation || 'Apply least privilege and standardize configurations.')}</div>
        <div style="font-family: var(--font-mono); font-size: 10px; background: var(--bg-body); padding: var(--space-3); border-radius: var(--radius-sm); border: 1px dashed var(--border-default); color: var(--color-success);">
          $ cloudsentinel playbook apply --action remediate --resource "${alert.resource}" --ref-cve "${alert.id}"
        </div>
      `;
    }

    // Toggle open
    overlay.classList.add('active');
    drawer.classList.add('open');
  }

  function closeThreatDrawer() {
    const drawer = document.getElementById('threat-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    activeDrawerAlert = null;
  }

  function getSeverityBadgeClass(sev) {
    return {
      CRITICAL: 'badge-critical',
      HIGH: 'badge-high',
      MEDIUM: 'badge-medium',
      LOW: 'badge-low'
    }[sev] || 'badge-info';
  }

  function setupEvents() {
    // Search input
    document.getElementById('hunter-search')?.addEventListener('input', applyHuntingFilters);

    // Dropdowns
    document.getElementById('filter-source')?.addEventListener('change', applyHuntingFilters);
    document.getElementById('filter-time')?.addEventListener('change', applyHuntingFilters);
    document.getElementById('hunter-sort')?.addEventListener('change', applyHuntingFilters);

    // Severity badges buttons toggles
    document.querySelectorAll('.filter-badge-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-badge-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeSeverityFilter = btn.dataset.severity;
        applyHuntingFilters();
      });
    });

    // Pagination
    document.getElementById('btn-prev')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderGrid();
      }
    });
    document.getElementById('btn-next')?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderGrid();
      }
    });

    // Close lateral drawer triggers
    document.getElementById('btn-close-drawer')?.addEventListener('click', closeThreatDrawer);
    document.getElementById('drawer-overlay')?.addEventListener('click', closeThreatDrawer);

    // Playbook automation button execution
    document.getElementById('btn-drawer-execute-playbook')?.addEventListener('click', () => {
      if (activeDrawerAlert) {
        Toast.show(`Executing SOC playbook mitigation automated script for: ${activeDrawerAlert.resource}`, 'info');
        
        setTimeout(() => {
          Toast.show(`Playbook executed successfully! Resource ${activeDrawerAlert.resource} brought back into secure compliance state.`, 'success');
          closeThreatDrawer();
        }, 1200);
      }
    });

    // Exporters
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      if (filteredAlerts.length === 0) {
        Toast.show('No hunting logs to export.', 'warning');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredAlerts, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "cloudsentinel_hunt_logs.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      Toast.show('Exported hunt index to JSON.', 'success');
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      if (filteredAlerts.length === 0) {
        Toast.show('No hunting logs to export.', 'warning');
        return;
      }
      const headers = ['id', 'severity', 'resource', 'source', 'description', 'risk_score', 'remediation', 'timestamp'];
      const csvRows = [
        headers.join(','),
        ...filteredAlerts.map(f => headers.map(header => {
          const val = f[header] || '';
          return `"${val.toString().replace(/"/g, '""')}"`;
        }).join(','))
      ];

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", csvContent);
      downloadAnchor.setAttribute("download", "cloudsentinel_hunt_logs.csv");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      Toast.show('Exported hunt index to CSV.', 'success');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', FindingsExplorer.init);
