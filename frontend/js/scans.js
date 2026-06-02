/* ============================================================
   CloudSentinel Scans Logic
   ============================================================ */

const Scans = (() => {
  let scanHistory = [];
  let currentReportId = null;
  let currentReportData = null;

  async function init() {
    await App.init('scans');
    setupScanParamInputs();
    await loadHistory();
    setupEvents();
  }

  function setupScanParamInputs() {
    const typeSelect = document.getElementById('scan-type-select');
    const paramInput = document.getElementById('scan-param-input');
    const paramLabel = document.getElementById('scan-param-label');

    if (!typeSelect || !paramInput || !paramLabel) return;

    typeSelect.addEventListener('change', () => {
      const type = typeSelect.value;
      if (type === 'docker') {
        paramLabel.textContent = 'Docker Image Target';
        paramInput.placeholder = 'e.g. library/ubuntu:latest or node:18-alpine';
        paramInput.value = 'ubuntu:latest';
      } else if (type === 'aws') {
        paramLabel.textContent = 'AWS Scan Action / Region';
        paramInput.placeholder = 'e.g. us-east-1 or all-regions';
        paramInput.value = 'us-east-1';
      } else {
        paramLabel.textContent = 'Project Directory Name / Repository';
        paramInput.placeholder = 'e.g. backend or my-terraform-folder';
        paramInput.value = 'c:/CloudSentinel/tests';
      }
    });

    // Set initial default value
    typeSelect.dispatchEvent(new Event('change'));
  }

  async function loadHistory() {
    const tbody = document.getElementById('scans-tbody');
    if (!tbody) return;

    tbody.innerHTML = App.skeletonRows(5, 6);

    try {
      const data = await API.get('/scan/history');
      scanHistory = data || [];
      
      // Update sidebar findings badge while we're at it
      const findingsData = await API.get('/findings/all').catch(() => []);
      const badge = document.getElementById('findings-count');
      if (badge) badge.textContent = findingsData.length;

      renderHistoryTable();
    } catch (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Unable to load scan history. Check backend connection.</td></tr>';
      Toast.show('Error loading scan history: ' + error.message, 'error');
    }
  }

  function renderHistoryTable() {
    const tbody = document.getElementById('scans-tbody');
    if (!tbody) return;

    if (scanHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No security scans have been run yet. Launch one above!</td></tr>';
      return;
    }

    // Sort by newest first
    const sorted = [...scanHistory].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    tbody.innerHTML = sorted.map(scan => {
      const id = scan.id || 'N/A';
      const timestamp = App.formatDate(scan.created_at);
      const target = escapeHtml(scan.target || 'Infrastructure');
      const findingsCount = scan.findings_count !== undefined ? scan.findings_count : '—';
      
      // Status badge layout
      const status = (scan.status || 'COMPLETED').toUpperCase();
      let statusClass = 'badge-success';
      if (status === 'RUNNING' || status === 'PENDING') statusClass = 'badge-warning';
      if (status === 'FAILED') statusClass = 'badge-critical';

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-semibold);">${id}</td>
          <td>${timestamp}</td>
          <td><span class="badge badge-info">${target}</span></td>
          <td><span class="badge ${statusClass}">${status}</span></td>
          <td style="font-weight: var(--weight-bold);">${findingsCount}</td>
          <td>
            <button class="btn btn-ghost btn-sm btn-view-report" data-id="${id}">View Report</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click events
    tbody.querySelectorAll('.btn-view-report').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openScanReport(id);
      });
    });
  }

  async function openScanReport(scanId) {
    const modal = document.getElementById('scan-report-modal');
    if (!modal) return;

    currentReportId = scanId;
    currentReportData = null;

    document.getElementById('report-modal-title').textContent = `Scan Execution Report — #${scanId}`;
    document.getElementById('report-target').textContent = 'Loading...';
    document.getElementById('report-findings-count').textContent = '...';
    document.getElementById('report-time').textContent = '...';
    document.getElementById('report-raw-json').textContent = 'Fetching report log from CloudSentinel API...';

    modal.classList.add('open');

    try {
      const report = await API.get(`/reports/scan/${scanId}`);
      currentReportData = report;

      document.getElementById('report-target').textContent = report.target || 'N/A';
      document.getElementById('report-findings-count').textContent = report.findings_count !== undefined ? report.findings_count : '0';
      document.getElementById('report-time').textContent = App.formatDate(report.created_at);
      document.getElementById('report-raw-json').textContent = JSON.stringify(report.report_data || report, null, 2);
    } catch (error) {
      console.error(error);
      document.getElementById('report-raw-json').textContent = `Error fetching scan log: ${error.message}`;
      Toast.show('Failed to fetch report detail: ' + error.message, 'error');
    }
  }

  function closeScanReport() {
    const modal = document.getElementById('scan-report-modal');
    if (modal) modal.classList.remove('open');
    currentReportId = null;
    currentReportData = null;
  }

  function setupEvents() {
    // Refresh history btn
    document.getElementById('btn-refresh-history')?.addEventListener('click', async () => {
      Toast.show('Refreshed scan logs', 'info');
      await loadHistory();
    });

    // Form submit for triggering new scan
    document.getElementById('new-scan-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const typeSelect = document.getElementById('scan-type-select');
      const paramInput = document.getElementById('scan-param-input');
      const startBtn = document.getElementById('start-scan-btn');

      if (!typeSelect || !paramInput || !startBtn) return;

      const scanType = typeSelect.value;
      const scanParam = paramInput.value.trim();

      if (!scanParam) {
        Toast.show('Please provide a scan parameter target.', 'warning');
        return;
      }

      // UI disabled loading state
      const originalHTML = startBtn.innerHTML;
      startBtn.disabled = true;
      startBtn.innerHTML = `
        <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
        <span>Running Audit...</span>
      `;

      try {
        let endpoint = '/scan/start';
        let bodyPayload = { scan_type: scanType }; // Match backend payload scans routing expects

        const response = await API.post(endpoint, bodyPayload);
        Toast.show(response.message || 'Security scan triggered in background.', 'success');
        
        // Wait and refresh logs
        setTimeout(async () => {
          await loadHistory();
        }, 1500);

      } catch (error) {
        console.error(error);
        Toast.show('Scan failed to trigger: ' + error.message, 'error');
      } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = originalHTML;
      }
    });

    // Direct IaC Paste Sandbox submit (Requirement 9)
    document.getElementById('direct-scan-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contentInput = document.getElementById('direct-scan-content');
      const startBtn = document.getElementById('direct-scan-btn');
      const resultsDiv = document.getElementById('direct-scan-results');
      const tbody = document.getElementById('direct-scan-tbody');

      if (!contentInput || !startBtn || !resultsDiv || !tbody) return;

      const content = contentInput.value.trim();
      if (!content) {
        Toast.show('Please paste Terraform or Kubernetes configuration content to analyze.', 'warning');
        return;
      }

      startBtn.disabled = true;
      const originalHTML = startBtn.innerHTML;
      startBtn.innerHTML = `
        <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
        <span>Analyzing Configuration...</span>
      `;

      try {
        const response = await API.post('/security/analyze', { content });
        Toast.show('Direct configuration analyzed successfully!', 'success');
        
        const findings = response.findings || [];
        if (findings.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No vulnerability findings detected in configuration. Compliant state!</td></tr>';
        } else {
          tbody.innerHTML = findings.map(f => `
            <tr>
              <td>${App.severityBadge(f.severity)}</td>
              <td style="font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-bold);">${escapeHtml(f.resource || '—')}</td>
              <td>${escapeHtml(f.description || '—')}</td>
              <td style="font-weight: var(--weight-bold); color: var(--color-primary-hover);">${f.risk_score || 0}</td>
              <td class="aws-finding-remediation" style="border-left-width: 3px; font-size: var(--text-xs); padding: var(--space-2); margin: 0;">
                ${escapeHtml(f.remediation || 'Restrict permissive settings.')}
              </td>
            </tr>
          `).join('');
        }
        resultsDiv.classList.remove('hidden');

        // Auto refresh scans history
        await loadHistory();

      } catch (error) {
        console.error(error);
        Toast.show('Paste scan failed: ' + error.message, 'error');
      } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = originalHTML;
      }
    });

    // Close Report triggers
    document.getElementById('report-close-btn')?.addEventListener('click', closeScanReport);
    document.getElementById('report-dismiss-btn')?.addEventListener('click', closeScanReport);
    document.getElementById('scan-report-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'scan-report-modal') closeScanReport();
    });

    // Download report raw JSON
    document.getElementById('report-download-btn')?.addEventListener('click', () => {
      if (!currentReportData) {
        Toast.show('No report data available to download.', 'warning');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentReportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `cloudsentinel_report_${currentReportId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      Toast.show('Downloaded raw scan report JSON.', 'success');
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

document.addEventListener('DOMContentLoaded', Scans.init);
