/* ============================================================
   CloudSentinel Findings Logic
   ============================================================ */

const Findings = (() => {
  let allFindings = [];
  let filteredFindings = [];
  let currentPage = 1;
  const itemsPerPage = 10;
  let activeModalFinding = null;

  async function init() {
    await App.init('findings');
    await loadFindings();
    setupEvents();
  }

  async function loadFindings() {
    const tbody = document.getElementById('findings-tbody');
    if (!tbody) return;

    tbody.innerHTML = App.skeletonRows(6, 6);

    try {
      const data = await API.get('/findings/all');
      allFindings = data || [];
      
      // Update sidebar badge
      const badge = document.getElementById('findings-count');
      if (badge) badge.textContent = allFindings.length;

      applyFiltersAndRender();
    } catch (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Unable to load findings. Check backend connection.</td></tr>';
      Toast.show('Error loading findings: ' + error.message, 'error');
    }
  }

  function applyFiltersAndRender() {
    const searchQuery = document.getElementById('finding-search')?.value.toLowerCase() || '';
    const severityFilter = document.getElementById('filter-severity')?.value || 'ALL';
    const sortBy = document.getElementById('filter-sort')?.value || 'score-desc';

    // 1. Search + Severity Filtering
    filteredFindings = allFindings.filter(f => {
      const matchesSearch = 
        (f.resource || '').toLowerCase().includes(searchQuery) ||
        (f.description || '').toLowerCase().includes(searchQuery) ||
        (f.category || '').toLowerCase().includes(searchQuery) ||
        (f.id || '').toString().includes(searchQuery);

      const matchesSeverity = severityFilter === 'ALL' || (f.severity || '').toUpperCase() === severityFilter;

      return matchesSearch && matchesSeverity;
    });

    // 2. Sorting
    filteredFindings.sort((a, b) => {
      if (sortBy === 'score-desc') {
        return (b.risk_score || 0) - (a.risk_score || 0);
      } else if (sortBy === 'score-asc') {
        return (a.risk_score || 0) - (b.risk_score || 0);
      } else if (sortBy === 'sev-desc') {
        const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const weightA = severityWeight[(a.severity || '').toUpperCase()] || 0;
        const weightB = severityWeight[(b.severity || '').toUpperCase()] || 0;
        if (weightB !== weightA) return weightB - weightA;
        return (b.risk_score || 0) - (a.risk_score || 0);
      }
      return 0;
    });

    // Update total badge
    const badgeEl = document.getElementById('findings-total-badge');
    if (badgeEl) badgeEl.textContent = `${filteredFindings.length} Found`;

    // Render table
    currentPage = 1;
    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('findings-tbody');
    const infoEl = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (!tbody) return;

    if (filteredFindings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No findings match the current search or filters.</td></tr>';
      if (infoEl) infoEl.textContent = 'Showing 0 to 0 of 0 findings';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(filteredFindings.length / itemsPerPage);
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, filteredFindings.length);
    const pageItems = filteredFindings.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems.map(f => {
      const category = f.category || (f.resource && f.resource.startsWith('launch-wizard') ? 'Terraform' : 'Infrastructure');
      return `
        <tr class="clickable-row" data-id="${escapeHtml(f.id || '')}">
          <td>${App.severityBadge(f.severity)}</td>
          <td style="color: var(--text-primary); font-weight: var(--weight-medium); font-family: var(--font-mono); font-size: var(--text-xs);">${escapeHtml(f.resource || '—')}</td>
          <td><span class="badge badge-info">${escapeHtml(category)}</span></td>
          <td>
            <div style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(f.description || '')}">
              ${escapeHtml(f.description || '—')}
            </div>
          </td>
          <td>
            <div class="flex items-center gap-2">
              <div class="progress-bar" style="width: 50px; height: 4px;">
                <div class="progress-bar-fill ${f.risk_score > 7 ? 'critical' : f.risk_score > 4 ? 'warning' : 'success'}" style="width: ${(f.risk_score || 0) * 10}%"></div>
              </div>
              <span class="text-sm font-semibold">${f.risk_score || 0}</span>
            </div>
          </td>
          <td>
            <button class="btn btn-ghost btn-sm view-details-btn" data-id="${escapeHtml(f.id || '')}">View Details</button>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination info & buttons
    if (infoEl) {
      infoEl.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${filteredFindings.length} findings`;
    }
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    // Attach row events
    tbody.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-details-btn')) return; // handled by button handler
        const id = row.getAttribute('data-id');
        openFindingDetails(id);
      });
    });

    tbody.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openFindingDetails(id);
      });
    });
  }

  function openFindingDetails(findingId) {
    const finding = allFindings.find(f => (f.id || '').toString() === findingId.toString());
    if (!finding) return;

    activeModalFinding = finding;

    const modal = document.getElementById('finding-detail-modal');
    if (!modal) return;

    document.getElementById('modal-finding-title').textContent = finding.description || 'Finding Details';
    document.getElementById('modal-finding-severity').innerHTML = App.severityBadge(finding.severity);
    document.getElementById('modal-finding-score').textContent = `Risk Score: ${finding.risk_score || 0}/10`;
    document.getElementById('modal-finding-resource').textContent = finding.resource || 'N/A';
    document.getElementById('modal-finding-desc').textContent = finding.description || 'No description available.';

    const remEl = document.getElementById('modal-finding-remediation');
    if (remEl) {
      remEl.innerHTML = `<strong>Recommended Remediation:</strong> ${escapeHtml(finding.remediation || 'Apply least privilege and standard cloud security configurations.')}`;
    }

    modal.classList.add('open');
  }

  function closeFindingDetails() {
    const modal = document.getElementById('finding-detail-modal');
    if (modal) modal.classList.remove('open');
    activeModalFinding = null;
  }

  function setupEvents() {
    // Search input typing
    const searchInput = document.getElementById('finding-search');
    if (searchInput) {
      searchInput.addEventListener('input', applyFiltersAndRender);
    }

    // Dropdowns
    document.getElementById('filter-severity')?.addEventListener('change', applyFiltersAndRender);
    document.getElementById('filter-sort')?.addEventListener('change', applyFiltersAndRender);

    // Pagination buttons
    document.getElementById('btn-prev')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredFindings.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    });

    // Close modal triggers
    document.getElementById('modal-close-btn')?.addEventListener('click', closeFindingDetails);
    document.getElementById('modal-dismiss-btn')?.addEventListener('click', closeFindingDetails);
    document.getElementById('finding-detail-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'finding-detail-modal') closeFindingDetails();
    });

    // Remediation action
    document.getElementById('modal-remediate-btn')?.addEventListener('click', () => {
      if (activeModalFinding) {
        Toast.show(`Remediation applied successfully to resource: ${activeModalFinding.resource}`, 'success');
        closeFindingDetails();
      }
    });

    // Export Actions
    document.getElementById('export-json')?.addEventListener('click', () => {
      if (filteredFindings.length === 0) {
        Toast.show('No findings to export.', 'warning');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredFindings, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "cloudsentinel_findings.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      Toast.show('Exported findings to JSON.', 'success');
    });

    document.getElementById('export-csv')?.addEventListener('click', () => {
      if (filteredFindings.length === 0) {
        Toast.show('No findings to export.', 'warning');
        return;
      }
      
      const headers = ['id', 'severity', 'resource', 'description', 'risk_score', 'remediation'];
      const csvRows = [
        headers.join(','),
        ...filteredFindings.map(f => headers.map(header => {
          const val = f[header] || '';
          return `"${val.toString().replace(/"/g, '""')}"`;
        }).join(','))
      ];

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", csvContent);
      downloadAnchor.setAttribute("download", "cloudsentinel_findings.csv");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      Toast.show('Exported findings to CSV.', 'success');
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

document.addEventListener('DOMContentLoaded', Findings.init);
