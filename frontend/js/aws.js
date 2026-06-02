/* ============================================================
   CloudSentinel AWS Security Logic
   ============================================================ */

const AWSPage = (() => {
  let awsFindings = [];
  let isDemoMode = false;
  let severityChart = null;

  const DEMO_FINDINGS = [
    {
      severity: "CRITICAL",
      resource: "developer-prod-admin",
      description: "Administrator access assigned to standard developer account",
      remediation: "Apply least privilege principles, configure specific IAM policies, and require MFA.",
      service: "IAM"
    },
    {
      severity: "HIGH",
      resource: "public-assets-static-website",
      description: "Public read access allowed on S3 Bucket holding internal asset descriptors",
      remediation: "Configure S3 Block Public Access policies and utilize CloudFront with OAI instead.",
      service: "S3"
    },
    {
      severity: "HIGH",
      resource: "launch-wizard-2",
      description: "Overly permissive Security Group: Public ingress (0.0.0.0/0) allowed on admin port 22 (SSH)",
      remediation: "Restrict IP ranges to your corporate VPN block or utilize AWS Systems Manager Session Manager.",
      service: "EC2"
    },
    {
      severity: "MEDIUM",
      resource: "prod-database-sg",
      description: "Database security group allows ingress from non-application server tiers",
      remediation: "Restrict ingress access rules strictly to the application server security group ID.",
      service: "EC2"
    }
  ];

  async function init() {
    await App.init('aws');
    setupEvents();
    // Default load: attempt live, fallback to demo if missing auth credentials
    await runAWSScan(false);
  }

  async function runAWSScan(forceLive = false) {
    const container = document.getElementById('aws-findings-container');
    const loader = document.getElementById('aws-scan-loader');
    const triggerBtn = document.getElementById('btn-trigger-aws-scan');

    if (!container) return;

    // Loading UX
    container.innerHTML = `<div class="table-empty" style="grid-column: 1 / -1;">
      <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28" style="margin: 0 auto var(--space-3); color: var(--color-primary);"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
      Analyzing AWS resource state using Boto3 API...
    </div>`;

    if (loader) loader.style.display = 'inline';
    if (triggerBtn) triggerBtn.disabled = true;

    try {
      if (isDemoMode && !forceLive) {
        // Run as demo mode
        setTimeout(() => {
          awsFindings = [...DEMO_FINDINGS];
          renderAWSResults();
          Toast.show('Loaded AWS security scanner demonstration configurations.', 'info');
          finishLoading();
        }, 800);
        return;
      }

      // Try Live Scan
      const data = await API.get('/aws/scan');
      awsFindings = data || [];
      isDemoMode = false;
      
      const connBadge = document.getElementById('aws-connection-status');
      if (connBadge) {
        connBadge.className = 'status-dot online';
        connBadge.textContent = 'AWS Client Connected';
      }

      renderAWSResults();
      Toast.show(`AWS configuration scan finished! Found ${awsFindings.length} violations.`, 'success');

    } catch (error) {
      console.warn("AWS scan failed:", error.message);
      
      // Fallback automatically to demo mode since standard developers don't have active credentials configured locally
      isDemoMode = true;
      awsFindings = [...DEMO_FINDINGS];
      
      const connBadge = document.getElementById('aws-connection-status');
      if (connBadge) {
        connBadge.className = 'status-dot offline';
        connBadge.textContent = 'Demo Mode (Auth Sandbox)';
      }

      renderAWSResults();
      
      if (forceLive) {
        Toast.show(`Boto3 credentials missing or incomplete. Toggled Demo Sandbox Mode.`, 'warning');
      } else {
        Toast.show(`AWS cloud scan initialized in sandbox demo mode.`, 'info');
      }
    } finally {
      finishLoading();
    }
  }

  function finishLoading() {
    const loader = document.getElementById('aws-scan-loader');
    const triggerBtn = document.getElementById('btn-trigger-aws-scan');
    if (loader) loader.style.display = 'none';
    if (triggerBtn) triggerBtn.disabled = false;
  }

  function renderAWSResults() {
    const container = document.getElementById('aws-findings-container');
    const totalEl = document.getElementById('aws-findings-total');

    if (!container) return;

    // Update total count
    if (totalEl) totalEl.textContent = `${awsFindings.length} Alerts`;

    // Service counter tallies
    let s3Count = 0;
    let sgCount = 0;
    let iamCount = 0;

    awsFindings.forEach(f => {
      const desc = (f.description || '').toLowerCase();
      const res = (f.resource || '').toLowerCase();
      const srv = (f.service || '').toUpperCase();

      if (srv === 'S3' || desc.includes('s3') || desc.includes('bucket')) {
        s3Count++;
      } else if (srv === 'EC2' || desc.includes('security group') || desc.includes('ingress') || desc.includes('cidr')) {
        sgCount++;
      } else if (srv === 'IAM' || desc.includes('privilege') || desc.includes('administrator') || desc.includes('access key')) {
        iamCount++;
      } else {
        sgCount++; // default/other
      }
    });

    document.getElementById('count-s3-findings').textContent = s3Count;
    document.getElementById('count-sg-findings').textContent = sgCount;
    document.getElementById('count-iam-findings').textContent = iamCount;

    // Render findings cards
    if (awsFindings.length === 0) {
      container.innerHTML = `<div class="table-empty" style="grid-column: 1 / -1;">No cloud vulnerabilities detected in your AWS services! Good job.</div>`;
      return;
    }

    container.innerHTML = awsFindings.map(f => {
      const srv = f.service || (f.description.includes('S3') ? 'S3' : f.description.includes('access') ? 'IAM' : 'EC2');
      let serviceLabel = 'EC2 Group';
      if (srv === 'S3') serviceLabel = 'Simple Storage Service (S3)';
      if (srv === 'IAM') serviceLabel = 'Identity & Access Management (IAM)';

      return `
        <div class="aws-finding-card animate-fade-in-up">
          <div class="aws-finding-header">
            ${App.severityBadge(f.severity)}
            <span class="badge badge-info" style="font-size: 10px;">${serviceLabel}</span>
          </div>
          <div class="aws-finding-resource" style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--weight-bold); color: var(--text-primary);">${escapeHtml(f.resource)}</div>
          <div class="aws-finding-desc" style="font-size: var(--text-sm); line-height: var(--leading-relaxed); margin: var(--space-2) 0;">${escapeHtml(f.description)}</div>
          <div class="aws-finding-remediation" style="font-size: var(--text-xs); background: var(--bg-body); border-radius: var(--radius-md); padding: var(--space-3); border-left: 3px solid var(--color-primary);">
            <strong>Remediation:</strong> ${escapeHtml(f.remediation || 'Configure restrictions via IAM/IAM policy.')}
          </div>
        </div>
      `;
    }).join('');

    // Replot Severity breakdown chart
    renderSeverityChart();
  }

  function renderSeverityChart() {
    const ctx = document.getElementById('aws-severity-chart');
    if (!ctx) return;

    if (severityChart) {
      severityChart.destroy();
    }

    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    awsFindings.forEach(f => {
      const sev = (f.severity || '').toUpperCase();
      if (counts[sev] !== undefined) counts[sev]++;
      else counts.MEDIUM++;
    });

    const badge = document.getElementById('aws-chart-badge');
    if (badge) badge.textContent = isDemoMode ? 'Sandbox Active' : 'Live Data';

    severityChart = Charts.createSeverityDoughnut(ctx.getContext('2d'), counts);
  }

  function setupEvents() {
    // Scan Trigger button
    document.getElementById('btn-trigger-aws-scan')?.addEventListener('click', async () => {
      Toast.show('Triggering real-time AWS Cloud Scan...', 'info');
      await runAWSScan(true);
    });

    // Toggle sandbox mode button
    document.getElementById('btn-toggle-sandbox')?.addEventListener('click', async () => {
      isDemoMode = !isDemoMode;
      Toast.show(`Toggled AWS scan environment mode: ${isDemoMode ? 'Demo Sandbox' : 'Live Client Integration'}`, 'info');
      await runAWSScan(false);
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

document.addEventListener('DOMContentLoaded', AWSPage.init);
