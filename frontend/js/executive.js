/* ============================================================
   CloudSentinel Executive SOC Dashboard Logic
   ============================================================ */

const ExecutiveSOC = (() => {
  // Chart instances
  let riskTrendChart = null;
  let severityPieChart = null;
  let resourceDistChart = null;
  let scanActivityChart = null;
  let complianceStatusChart = null;

  // Active state data
  let currentMetrics = {
    scans: 148,
    findings: 34,
    critical: 3,
    drift: 12,
    resources: 840,
    securityScore: 85,
    complianceScore: 92,
    incidents: 4
  };

  const MOCK_FINDINGS = [
    { severity: "CRITICAL", resource: "iamadmin", desc: "Administrator access assigned to developer role", risk: 9.8, status: "Open" },
    { severity: "HIGH", resource: "launch-wizard-2", desc: "Public ingress SSH port 22 open to CIDR 0.0.0.0/0", risk: 8.5, status: "Investigating" },
    { severity: "HIGH", resource: "static_website", desc: "S3 bucket allowed to block write policy overrides", risk: 7.8, status: "Open" },
    { severity: "MEDIUM", resource: "ec2-internal-db", desc: "Unencrypted EBS volume attached to relational database", risk: 5.6, status: "Mitigated" },
    { severity: "LOW", resource: "iam-dev-policy", desc: "IAM policy lacks explicit multi-factor auth restrictions", risk: 3.2, status: "Resolved" }
  ];

  async function init() {
    await App.init('executive');
    
    // Attempt to pull real metrics from API, and merge if possible
    await attemptPreloadRealMetrics();

    // Render KPI widgets
    updateWidgets();

    // Initialize Charts
    initCharts();

    // Render Table
    renderRecentFindings();

    // Setup Simulation Sliders
    setupSliders();
  }

  async function attemptPreloadRealMetrics() {
    try {
      const stats = await API.get('/statistics/severity');
      const metrics = await API.get('/dashboard/metrics');
      const driftData = await API.get('/history/history').catch(() => []);

      if (metrics) {
        currentMetrics.scans = metrics.total_scans || 148;
        currentMetrics.findings = metrics.total_findings || 34;
      }
      if (stats) {
        currentMetrics.critical = stats.CRITICAL || 3;
      }
      if (driftData) {
        currentMetrics.drift = driftData.length || 12;
      }

      // Sync sliders values
      document.getElementById('slide-scans').value = currentMetrics.scans;
      document.getElementById('slide-findings').value = currentMetrics.findings;
      document.getElementById('slide-critical').value = currentMetrics.critical;
      document.getElementById('slide-drift').value = currentMetrics.drift;

    } catch (e) {
      console.warn("Could not sync real database metrics, utilizing mock presets:", e.message);
    }
  }

  function updateWidgets() {
    // Standard stat cards
    document.getElementById('stat-scans').textContent = currentMetrics.scans.toLocaleString();
    document.getElementById('stat-findings').textContent = currentMetrics.findings.toLocaleString();
    document.getElementById('stat-critical-findings').textContent = currentMetrics.critical.toLocaleString();
    document.getElementById('stat-drift-events').textContent = currentMetrics.drift.toLocaleString();
    document.getElementById('stat-monitored-resources').textContent = currentMetrics.resources.toLocaleString();
    document.getElementById('stat-open-incidents').textContent = currentMetrics.incidents.toLocaleString();

    // Pulse glowing updates on critical
    const criticalCard = document.getElementById('stat-critical-findings').closest('.stat-card');
    if (criticalCard) {
      if (currentMetrics.critical > 0) {
        criticalCard.classList.add('pulsing-alert-glow');
      } else {
        criticalCard.classList.remove('pulsing-alert-glow');
      }
    }

    // Dynamic Conic Radials Score Indicators
    renderRadialGauges();
  }

  function renderRadialGauges() {
    const secEl = document.getElementById('radial-security-score');
    const compEl = document.getElementById('radial-compliance-score');

    if (secEl) {
      secEl.textContent = `${currentMetrics.securityScore}%`;
      secEl.setAttribute('aria-valuenow', currentMetrics.securityScore);
      // Determine colors based on scores
      let secColor = 'var(--color-primary)';
      if (currentMetrics.securityScore < 50) secColor = 'var(--color-critical)';
      else if (currentMetrics.securityScore < 80) secColor = 'var(--color-warning)';
      else secColor = 'var(--color-success)';

      secEl.style.setProperty('--score-color', secColor);
      secEl.style.setProperty('--score-percent', `${currentMetrics.securityScore}%`);
      secEl.style.background = `radial-gradient(closest-side, var(--bg-card) 79%, transparent 80% 100%),
                                conic-gradient(${secColor} ${currentMetrics.securityScore}%, var(--border-default) 0)`;
    }

    if (compEl) {
      compEl.textContent = `${currentMetrics.complianceScore}%`;
      compEl.setAttribute('aria-valuenow', currentMetrics.complianceScore);
      let compColor = 'var(--color-success)';
      if (currentMetrics.complianceScore < 50) compColor = 'var(--color-critical)';
      else if (currentMetrics.complianceScore < 80) compColor = 'var(--color-warning)';

      compEl.style.setProperty('--score-color', compColor);
      compEl.style.setProperty('--score-percent', `${currentMetrics.complianceScore}%`);
      compEl.style.background = `radial-gradient(closest-side, var(--bg-card) 79%, transparent 80% 100%),
                                 conic-gradient(${compColor} ${currentMetrics.complianceScore}%, var(--border-default) 0)`;
    }
  }

  function initCharts() {
    // 1. Risk Trend Line Chart
    const riskCtx = document.getElementById('executive-risk-chart')?.getContext('2d');
    if (riskCtx) {
      const riskGradient = riskCtx.createLinearGradient(0, 0, 0, 250);
      riskGradient.addColorStop(0, 'rgba(37, 99, 235, 0.4)');
      riskGradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

      riskTrendChart = Charts.register(new Chart(riskCtx, {
        type: 'line',
        data: {
          labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'],
          datasets: [{
            label: 'Incident Severity Risk index',
            data: [42, 38, 45, 30, 24, 28, 33, 20, 15, 18, 12, 100 - currentMetrics.securityScore],
            borderColor: 'var(--color-primary)',
            backgroundColor: riskGradient,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: 'var(--color-primary)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748B' } },
            y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748B' }, beginAtZero: true, max: 100 }
          }
        }
      }));
    }

    // 2. Findings By Severity Pie Chart
    const sevCtx = document.getElementById('executive-severity-chart')?.getContext('2d');
    if (sevCtx) {
      severityPieChart = Charts.register(new Chart(sevCtx, {
        type: 'pie',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: [{
            data: [
              currentMetrics.critical, 
              Math.round(currentMetrics.findings * 0.3), 
              Math.round(currentMetrics.findings * 0.4), 
              Math.max(1, currentMetrics.findings - currentMetrics.critical - Math.round(currentMetrics.findings * 0.7))
            ],
            backgroundColor: [
              Charts.COLORS.critical,
              Charts.COLORS.high,
              Charts.COLORS.warning,
              Charts.COLORS.success
            ],
            borderColor: 'transparent'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#CBD5E1', boxWidth: 10, padding: 12 }
            }
          }
        }
      }));
    }

    // 3. AWS Resource Distribution Chart
    const resCtx = document.getElementById('executive-resource-chart')?.getContext('2d');
    if (resCtx) {
      resourceDistChart = Charts.register(new Chart(resCtx, {
        type: 'bar',
        data: {
          labels: ['S3 Buckets', 'EC2 Nodes', 'IAM Policies', 'RDS Databases', 'EKS Clusters'],
          datasets: [{
            label: 'Scanned Assets',
            data: [
              Math.round(currentMetrics.resources * 0.25),
              Math.round(currentMetrics.resources * 0.35),
              Math.round(currentMetrics.resources * 0.20),
              Math.round(currentMetrics.resources * 0.12),
              Math.round(currentMetrics.resources * 0.08)
            ],
            backgroundColor: Charts.COLORS.primary,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748B' } },
            y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748B' } }
          }
        }
      }));
    }

    // 4. Weekly Scan Activity Chart
    const actCtx = document.getElementById('executive-activity-chart')?.getContext('2d');
    if (actCtx) {
      scanActivityChart = Charts.register(new Chart(actCtx, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Compliance checks',
              data: [
                Math.round(currentMetrics.scans * 0.15),
                Math.round(currentMetrics.scans * 0.20),
                Math.round(currentMetrics.scans * 0.18),
                Math.round(currentMetrics.scans * 0.22),
                Math.round(currentMetrics.scans * 0.15),
                Math.round(currentMetrics.scans * 0.06),
                Math.round(currentMetrics.scans * 0.04)
              ],
              backgroundColor: 'rgba(99, 102, 241, 0.75)',
              borderRadius: 4
            },
            {
              label: 'Drift audits',
              data: [
                Math.round(currentMetrics.drift * 0.1),
                Math.round(currentMetrics.drift * 0.2),
                Math.round(currentMetrics.drift * 0.1),
                Math.round(currentMetrics.drift * 0.3),
                Math.round(currentMetrics.drift * 0.15),
                Math.round(currentMetrics.drift * 0.05),
                Math.round(currentMetrics.drift * 0.1)
              ],
              backgroundColor: 'rgba(245, 158, 11, 0.75)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#64748B', boxWidth: 8 } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748B' }, stacked: true },
            y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748B' }, stacked: true }
          }
        }
      }));
    }

    // 5. Compliance Status Chart
    const compCtx = document.getElementById('executive-compliance-chart')?.getContext('2d');
    if (compCtx) {
      complianceStatusChart = Charts.register(new Chart(compCtx, {
        type: 'radar',
        data: {
          labels: ['CIS Benchmark', 'NIST SP 800', 'SOC2 Cover', 'HIPAA Rule', 'ISO 27001'],
          datasets: [{
            label: 'Compliance Coverage (%)',
            data: [currentMetrics.complianceScore, 88, currentMetrics.complianceScore - 5, 82, 90],
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: 'var(--color-success)',
            borderWidth: 2,
            pointBackgroundColor: 'var(--color-success)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              angleLines: { color: 'rgba(255,255,255,0.06)' },
              grid: { color: 'rgba(255,255,255,0.06)' },
              pointLabels: { color: '#64748B', font: { size: 10 } },
              ticks: { color: '#64748B', backdropColor: 'transparent', showLabelBackdrop: false },
              suggestedMin: 50,
              suggestedMax: 100
            }
          }
        }
      }));
    }
  }

  function renderRecentFindings() {
    const tbody = document.getElementById('recent-findings-tbody');
    if (!tbody) return;

    tbody.innerHTML = MOCK_FINDINGS.map(f => {
      // Set status badges styles
      let statusCls = 'badge-info';
      if (f.status === 'Open') statusCls = 'badge-critical';
      if (f.status === 'Resolved') statusCls = 'badge-success';
      if (f.status === 'Investigating') statusCls = 'badge-warning';

      return `
        <tr>
          <td>${App.severityBadge(f.severity)}</td>
          <td style="font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-bold);">${escapeHtml(f.resource)}</td>
          <td>${escapeHtml(f.desc)}</td>
          <td>
            <span class="text-sm font-semibold">${f.risk}</span>
          </td>
          <td>
            <span class="badge ${statusCls}">${f.status}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function setupSliders() {
    const sliders = [
      { id: 'slide-scans', key: 'scans', lbl: 'lbl-slide-scans', formatter: v => v },
      { id: 'slide-findings', key: 'findings', lbl: 'lbl-slide-findings', formatter: v => v },
      { id: 'slide-critical', key: 'critical', lbl: 'lbl-slide-critical', formatter: v => v },
      { id: 'slide-drift', key: 'drift', lbl: 'lbl-slide-drift', formatter: v => v },
      { id: 'slide-resources', key: 'resources', lbl: 'lbl-slide-resources', formatter: v => v },
      { id: 'slide-score-security', key: 'securityScore', lbl: 'lbl-slide-score-security', formatter: v => `${v}%` },
      { id: 'slide-score-compliance', key: 'complianceScore', lbl: 'lbl-slide-score-compliance', formatter: v => `${v}%` },
      { id: 'slide-incidents', key: 'incidents', lbl: 'lbl-slide-incidents', formatter: v => v }
    ];

    sliders.forEach(slide => {
      const el = document.getElementById(slide.id);
      const label = document.getElementById(slide.lbl);
      if (!el) return;

      el.addEventListener('input', () => {
        const val = parseInt(el.value);
        currentMetrics[slide.key] = val;
        
        // Update slider numeric label
        if (label) label.textContent = slide.formatter(val);

        // Re-calculate dashboard and widgets
        updateWidgets();

        // Update active charts datasets live!
        updateChartsOnFly();
      });
    });
  }

  function updateChartsOnFly() {
    // 1. Risk Trend Chart update
    if (riskTrendChart) {
      // Risk index = 100 - Security Score
      riskTrendChart.data.datasets[0].data[11] = 100 - currentMetrics.securityScore;
      riskTrendChart.update('none'); // silent update without resetting animation
    }

    // 2. Severity Pie Chart update
    if (severityPieChart) {
      severityPieChart.data.datasets[0].data = [
        currentMetrics.critical, 
        Math.round(currentMetrics.findings * 0.3), 
        Math.round(currentMetrics.findings * 0.4), 
        Math.max(1, currentMetrics.findings - currentMetrics.critical - Math.round(currentMetrics.findings * 0.7))
      ];
      severityPieChart.update();
    }

    // 3. AWS Resource Tally update
    if (resourceDistChart) {
      resourceDistChart.data.datasets[0].data = [
        Math.round(currentMetrics.resources * 0.25),
        Math.round(currentMetrics.resources * 0.35),
        Math.round(currentMetrics.resources * 0.20),
        Math.round(currentMetrics.resources * 0.12),
        Math.round(currentMetrics.resources * 0.08)
      ];
      resourceDistChart.update();
    }

    // 4. Weekly Activity update
    if (scanActivityChart) {
      scanActivityChart.data.datasets[0].data = [
        Math.round(currentMetrics.scans * 0.15),
        Math.round(currentMetrics.scans * 0.20),
        Math.round(currentMetrics.scans * 0.18),
        Math.round(currentMetrics.scans * 0.22),
        Math.round(currentMetrics.scans * 0.15),
        Math.round(currentMetrics.scans * 0.06),
        Math.round(currentMetrics.scans * 0.04)
      ];
      scanActivityChart.data.datasets[1].data = [
        Math.round(currentMetrics.drift * 0.1),
        Math.round(currentMetrics.drift * 0.2),
        Math.round(currentMetrics.drift * 0.1),
        Math.round(currentMetrics.drift * 0.3),
        Math.round(currentMetrics.drift * 0.15),
        Math.round(currentMetrics.drift * 0.05),
        Math.round(currentMetrics.drift * 0.1)
      ];
      scanActivityChart.update();
    }

    // 5. Compliance status update
    if (complianceStatusChart) {
      complianceStatusChart.data.datasets[0].data[0] = currentMetrics.complianceScore;
      complianceStatusChart.data.datasets[0].data[2] = currentMetrics.complianceScore - 5;
      complianceStatusChart.update();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ExecutiveSOC.init);
