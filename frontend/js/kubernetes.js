/* ============================================================
   CloudSentinel Kubernetes Security Logic
   ============================================================ */

const KubernetesPage = (() => {
  let k8sFindings = [];
  let isDemoMode = false;
  let severityChart = null;

  const DEMO_FINDINGS = [
    {
      severity: "CRITICAL",
      resource: "k8s://namespaces/production/pods/payment-gateway-6b95/containers/payment-handler",
      description: "Container 'payment-handler' in pod 'payment-gateway-6b95' is running in privileged mode, granting excessive host permissions.",
      remediation: "Disable securityContext.privileged in your deployment manifest configurations."
    },
    {
      severity: "HIGH",
      resource: "k8s://namespaces/marketing/pods/analytics-cache-0/containers/redis-cache",
      description: "Container 'redis-cache' in pod 'analytics-cache-0' is configured to run as root.",
      remediation: "Configure securityContext.runAsNonRoot to true and specify runAsUser/runAsGroup."
    },
    {
      severity: "MEDIUM",
      resource: "k8s://namespaces/default/pods/web-portal-xyz/containers/nginx-web",
      description: "Container 'nginx-web' in pod 'web-portal-xyz' lacks a securityContext definition.",
      remediation: "Define securityContext with runAsNonRoot: true to restrict root capabilities."
    },
    {
      severity: "LOW",
      resource: "k8s://namespaces/default/pods/web-portal-xyz/containers/nginx-web",
      description: "Container 'nginx-web' in pod 'web-portal-xyz' does not enforce CPU or Memory limits, posing starvation risks.",
      remediation: "Define resource limits (resources.limits.cpu and resources.limits.memory) in the container specification."
    },
    {
      severity: "LOW",
      resource: "k8s://namespaces/default/pods/web-portal-xyz",
      description: "Pod 'web-portal-xyz' is running in the 'default' namespace.",
      remediation: "Migrate your application deployment workloads to isolated namespaces (e.g. staging, prod)."
    }
  ];

  async function init() {
    await App.init('kubernetes');
    setupEvents();
    // Default load: attempt live, fallback to demo if missing credentials or cluster offline
    await runK8sScan(false);
  }

  async function runK8sScan(forceLive = false) {
    const container = document.getElementById('k8s-findings-container');
    const loader = document.getElementById('k8s-scan-loader');
    const triggerBtn = document.getElementById('btn-trigger-k8s-scan');

    if (!container) return;

    // Loading UX
    container.innerHTML = `<div class="table-empty" style="grid-column: 1 / -1;">
      <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28" style="margin: 0 auto var(--space-3); color: var(--color-primary);"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
      Analyzing Kubernetes resource configuration state...
    </div>`;

    if (loader) loader.style.display = 'inline';
    if (triggerBtn) triggerBtn.disabled = true;

    try {
      if (isDemoMode && !forceLive) {
        // Run in demo mode
        setTimeout(() => {
          k8sFindings = [...DEMO_FINDINGS];
          renderK8sResults();
          Toast.show('Loaded Kubernetes security posture demonstration.', 'info');
          finishLoading();
        }, 800);
        return;
      }

      // Try Live Scan
      const data = await API.get('/kubernetes/scan');
      k8sFindings = data || [];
      isDemoMode = false;
      
      const connBadge = document.getElementById('k8s-connection-status');
      if (connBadge) {
        connBadge.className = 'status-dot online';
        connBadge.textContent = 'Kubernetes Cluster Connected';
      }

      renderK8sResults();
      Toast.show(`Kubernetes scan finished! Found ${k8sFindings.length} violations.`, 'success');

    } catch (error) {
      console.warn("Kubernetes scan failed:", error.message);
      
      // Fallback automatically to demo mode
      isDemoMode = true;
      k8sFindings = [...DEMO_FINDINGS];
      
      const connBadge = document.getElementById('k8s-connection-status');
      if (connBadge) {
        connBadge.className = 'status-dot offline';
        connBadge.textContent = 'Demo Mode (Auth Sandbox)';
      }

      renderK8sResults();
      
      if (forceLive) {
        Toast.show(`Kubernetes cluster unavailable. Toggled Demo Sandbox Mode.`, 'warning');
      } else {
        Toast.show(`Kubernetes scan initialized in sandbox demo mode.`, 'info');
      }
    } finally {
      finishLoading();
    }
  }

  function finishLoading() {
    const loader = document.getElementById('k8s-scan-loader');
    const triggerBtn = document.getElementById('btn-trigger-k8s-scan');
    if (loader) loader.style.display = 'none';
    if (triggerBtn) triggerBtn.disabled = false;
  }

  function renderK8sResults() {
    const container = document.getElementById('k8s-findings-container');
    const totalEl = document.getElementById('k8s-findings-total');

    if (!container) return;

    // Update total count
    if (totalEl) totalEl.textContent = `${k8sFindings.length} Alerts`;

    // Service counter tallies
    let namespaceCount = 0;
    let privRootCount = 0;
    let limitsCount = 0;

    k8sFindings.forEach(f => {
      const desc = (f.description || '').toLowerCase();

      if (desc.includes('namespace') || desc.includes('default namespace')) {
        namespaceCount++;
      } else if (desc.includes('privileged') || desc.includes('root') || desc.includes('securitycontext')) {
        privRootCount++;
      } else if (desc.includes('limit') || desc.includes('cpu') || desc.includes('memory') || desc.includes('starvation')) {
        limitsCount++;
      } else {
        limitsCount++; // default/other
      }
    });

    document.getElementById('count-sc-findings').textContent = namespaceCount;
    document.getElementById('count-priv-findings').textContent = privRootCount;
    document.getElementById('count-res-findings').textContent = limitsCount;

    // Render findings cards
    if (k8sFindings.length === 0) {
      container.innerHTML = `<div class="table-empty" style="grid-column: 1 / -1;">No security posture vulnerabilities detected in your cluster! Good job.</div>`;
      return;
    }

    container.innerHTML = k8sFindings.map(f => {
      const isPrivileged = f.description.toLowerCase().includes('privileged') || f.description.toLowerCase().includes('root');
      const isResource = f.description.toLowerCase().includes('limit') || f.description.toLowerCase().includes('cpu');
      const isNamespace = f.description.toLowerCase().includes('namespace');
      
      let badgeLabel = 'Namespace Context';
      if (isPrivileged) badgeLabel = 'Privileged Workload';
      else if (isResource) badgeLabel = 'Workload Resource Limits';

      return `
        <div class="aws-finding-card animate-fade-in-up">
          <div class="aws-finding-header">
            ${App.severityBadge(f.severity)}
            <span class="badge badge-info" style="font-size: 10px;">${badgeLabel}</span>
          </div>
          <div class="aws-finding-resource" style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--weight-bold); color: var(--text-primary); word-break: break-all;">${escapeHtml(f.resource)}</div>
          <div class="aws-finding-desc" style="font-size: var(--text-sm); line-height: var(--leading-relaxed); margin: var(--space-2) 0;">${escapeHtml(f.description)}</div>
          <div class="aws-finding-remediation" style="font-size: var(--text-xs); background: var(--bg-body); border-radius: var(--radius-md); padding: var(--space-3); border-left: 3px solid var(--color-primary);">
            <strong>Remediation:</strong> ${escapeHtml(f.remediation || 'Configure restrictions via securityContext.')}
          </div>
        </div>
      `;
    }).join('');

    // Replot Severity breakdown chart
    renderSeverityChart();
  }

  function renderSeverityChart() {
    const ctx = document.getElementById('k8s-severity-chart');
    if (!ctx) return;

    if (severityChart) {
      severityChart.destroy();
    }

    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    k8sFindings.forEach(f => {
      const sev = (f.severity || '').toUpperCase();
      if (counts[sev] !== undefined) counts[sev]++;
      else counts.MEDIUM++;
    });

    const badge = document.getElementById('k8s-chart-badge');
    if (badge) badge.textContent = isDemoMode ? 'Sandbox Active' : 'Live Data';

    severityChart = Charts.createSeverityDoughnut(ctx.getContext('2d'), counts);
  }

  function setupEvents() {
    // Scan Trigger button
    document.getElementById('btn-trigger-k8s-scan')?.addEventListener('click', async () => {
      Toast.show('Triggering real-time Kubernetes Posture Audit...', 'info');
      await runK8sScan(true);
    });

    // Toggle sandbox mode button
    document.getElementById('btn-toggle-sandbox')?.addEventListener('click', async () => {
      isDemoMode = !isDemoMode;
      Toast.show(`Toggled Kubernetes environment mode: ${isDemoMode ? 'Demo Sandbox' : 'Live Cluster Integration'}`, 'info');
      await runK8sScan(false);
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

document.addEventListener('DOMContentLoaded', KubernetesPage.init);
