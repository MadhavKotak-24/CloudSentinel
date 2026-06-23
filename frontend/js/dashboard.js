/* ============================================================
   CloudSentinel Dashboard Logic
   ============================================================ */

const Dashboard = (() => {
  let severityChart = null;
  let categoryChart = null;

  async function init() {
    await App.init('dashboard');
    loadMetrics();
    loadSeverityStats();
    loadRecentFindings();
    setupQuickActions();
  }

  async function loadMetrics() {
    try {
      const data = await API.get('/dashboard/metrics');
      const totalScans = data.total_scans || 0;
      const totalFindings = data.total_findings || 0;

      App.animateCounter(document.getElementById('stat-total-scans'), totalScans);
      App.animateCounter(document.getElementById('stat-total-findings'), totalFindings);
    } catch (error) {
      document.getElementById('stat-total-scans').textContent = '0';
      document.getElementById('stat-total-findings').textContent = '0';
      console.warn('Dashboard metrics unavailable:', error.message);
    }
  }

  async function loadSeverityStats() {
    try {
      const data = await API.get('/statistics/severity');
      const criticalCount = data.CRITICAL || 0;

      App.animateCounter(document.getElementById('stat-critical'), criticalCount);

      // Risk score calculation
      const total = (data.LOW || 0) + (data.MEDIUM || 0) + (data.HIGH || 0) + (data.CRITICAL || 0);
      const riskScore = total > 0
        ? Math.round(((data.CRITICAL * 10 + data.HIGH * 7 + data.MEDIUM * 4 + data.LOW * 1) / (total * 10)) * 100)
        : 0;

      const riskEl = document.getElementById('stat-risk-score');
      riskEl.textContent = riskScore + '/100';

      const barEl = document.getElementById('risk-score-bar');
      barEl.style.width = riskScore + '%';
      if (riskScore > 70) barEl.classList.add('critical');
      else if (riskScore > 40) barEl.classList.add('warning');
      else barEl.classList.add('success');

      // Severity doughnut chart
      const ctx = document.getElementById('severity-chart');
      if (ctx) {
        severityChart = Charts.createSeverityDoughnut(ctx.getContext('2d'), data);
      }

      // Category bar chart (reuse data)
      const catCtx = document.getElementById('category-chart');
      if (catCtx) {
        categoryChart = Charts.createBarChart(
          catCtx.getContext('2d'),
          ['Critical', 'High', 'Medium', 'Low'],
          [{
            label: 'Findings',
            data: [data.CRITICAL || 0, data.HIGH || 0, data.MEDIUM || 0, data.LOW || 0],
            color: [
              Charts.COLORS.critical,
              Charts.COLORS.high,
              Charts.COLORS.warning,
              Charts.COLORS.success,
            ],
            backgroundColor: [
              Charts.COLORS.critical,
              Charts.COLORS.high,
              Charts.COLORS.warning,
              Charts.COLORS.success,
            ],
          }]
        );
      }
    } catch (error) {
      document.getElementById('stat-critical').textContent = '0';
      document.getElementById('stat-risk-score').textContent = '0/100';
      console.warn('Severity stats unavailable:', error.message);
    }
  }

  async function loadRecentFindings() {
    const tbody = document.getElementById('recent-findings-tbody');

    try {
      const findings = await API.get('/findings/all');
      const recent = findings.slice(0, 10);

      if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No findings yet. Run a scan to detect issues.</td></tr>';
        return;
      }

      // Update findings badge
      const badge = document.getElementById('findings-count');
      if (badge) badge.textContent = findings.length;

      tbody.innerHTML = recent.map(f => `
        <tr>
          <td>${App.severityBadge(f.severity)}</td>
          <td style="color: var(--text-primary); font-weight: var(--weight-medium);">${escapeHtml(f.resource || '—')}</td>
          <td>${escapeHtml(f.description || '—')}</td>
          <td>
            <div class="flex items-center gap-2">
              <div class="progress-bar" style="width: 60px; height: 4px;">
                <div class="progress-bar-fill ${f.risk_score > 7 ? 'critical' : f.risk_score > 4 ? 'warning' : 'success'}" style="width: ${(f.risk_score || 0) * 10}%"></div>
              </div>
              <span class="text-sm">${f.risk_score || 0}</span>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Unable to load findings. Check backend connection.</td></tr>';
    }
  }

  function setupQuickActions() {
    document.getElementById('action-scan')?.addEventListener('click', () => {
      window.location.href = 'scans.html';
    });
    document.getElementById('action-aws')?.addEventListener('click', () => {
      window.location.href = 'aws.html';
    });
    document.getElementById('action-k8s')?.addEventListener('click', () => {
      window.location.href = 'kubernetes.html';
    });
    document.getElementById('action-drift')?.addEventListener('click', () => {
      window.location.href = 'drift.html';
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Dashboard.init);
