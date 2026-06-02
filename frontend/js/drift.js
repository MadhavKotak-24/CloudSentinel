/* ============================================================
   CloudSentinel Drift Detection Logic
   ============================================================ */

const Drift = (() => {
  const SAMPLE_TF = {
    resource_id: "sg-0985a12d34e9",
    resource_type: "aws_security_group",
    ingress_rules: [
      { port: 80, protocol: "tcp", cidr: "0.0.0.0/0" },
      { port: 443, protocol: "tcp", cidr: "0.0.0.0/0" }
    ],
    egress_rules: [
      { port: 0, protocol: "-1", cidr: "0.0.0.0/0" }
    ],
    tags: { Environment: "Production", Owner: "DevOps" }
  };

  const SAMPLE_AWS = {
    resource_id: "sg-0985a12d34e9",
    resource_type: "aws_security_group",
    ingress_rules: [
      { port: 80, protocol: "tcp", cidr: "0.0.0.0/0" },
      { port: 443, protocol: "tcp", cidr: "0.0.0.0/0" },
      { port: 22, protocol: "tcp", cidr: "0.0.0.0/0" } // <-- DRIFT: unauthorized SSH rule
    ],
    egress_rules: [
      { port: 0, protocol: "-1", cidr: "0.0.0.0/0" }
    ],
    tags: { Environment: "Production", Owner: "DevOps", UntrackedTag: "AdHocAdminValue" }
  };

  async function init() {
    await App.init('drift');
    loadHistory();
    setupEditors();
    setupEvents();
  }

  function setupEditors() {
    const expectedText = document.getElementById('drift-expected-json');
    const actualText = document.getElementById('drift-actual-json');

    if (expectedText) expectedText.value = JSON.stringify(SAMPLE_TF, null, 2);
    if (actualText) actualText.value = JSON.stringify(SAMPLE_AWS, null, 2);
  }

  async function loadHistory() {
    const tbody = document.getElementById('drift-history-tbody');
    if (!tbody) return;

    tbody.innerHTML = App.skeletonRows(4, 4);

    try {
      const data = await API.get('/history/history');
      
      // Update sidebar findings badge while we're at it
      const findingsData = await API.get('/findings/all').catch(() => []);
      const badge = document.getElementById('findings-count');
      if (badge) badge.textContent = findingsData.length;

      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No drift event history found. Run a comparison to log events!</td></tr>';
        return;
      }

      // Sort by newest first (since records don't have explicit dates, we show order of insertion)
      const reversed = [...data].reverse();

      tbody.innerHTML = reversed.map(event => `
        <tr>
          <td>${App.severityBadge(event.severity || 'HIGH')}</td>
          <td style="color: var(--text-primary); font-weight: var(--weight-medium);">${escapeHtml(event.resource || 'Security Group')}</td>
          <td style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(event.expected)}">${escapeHtml(event.expected)}</td>
          <td style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-critical); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(event.actual)}">${escapeHtml(event.actual)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Unable to load drift history. Verify backend server connection.</td></tr>';
    }
  }

  function setupEvents() {
    // Load sample buttons
    document.getElementById('btn-load-sample-tf')?.addEventListener('click', () => {
      const el = document.getElementById('drift-expected-json');
      if (el) {
        el.value = JSON.stringify(SAMPLE_TF, null, 2);
        Toast.show('Loaded expected Terraform state sample.', 'info');
      }
    });

    document.getElementById('btn-load-sample-aws')?.addEventListener('click', () => {
      const el = document.getElementById('drift-actual-json');
      if (el) {
        el.value = JSON.stringify(SAMPLE_AWS, null, 2);
        Toast.show('Loaded actual AWS configurations sample.', 'info');
      }
    });

    // Refresh history
    document.getElementById('btn-refresh-drift-history')?.addEventListener('click', async () => {
      Toast.show('Refreshed drift audits timeline', 'info');
      await loadHistory();
    });

    // Run drift compare
    document.getElementById('btn-run-drift')?.addEventListener('click', async () => {
      const expectedVal = document.getElementById('drift-expected-json')?.value.trim();
      const actualVal = document.getElementById('drift-actual-json')?.value.trim();
      const runBtn = document.getElementById('btn-run-drift');

      if (!expectedVal || !actualVal) {
        Toast.show('Please provide both expected and actual states for comparison.', 'warning');
        return;
      }

      // Check valid JSON
      let terraformObj, awsObj;
      try {
        terraformObj = JSON.parse(expectedVal);
      } catch (e) {
        Toast.show('Declared expected state is not valid JSON.', 'error');
        return;
      }

      try {
        awsObj = JSON.parse(actualVal);
      } catch (e) {
        Toast.show('Live cloud state is not valid JSON.', 'error');
        return;
      }

      const originalHTML = runBtn.innerHTML;
      runBtn.disabled = true;
      runBtn.innerHTML = `
        <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
        <span>Comparing State Engines...</span>
      `;

      try {
        // Send actual string contents if that's what the backend expects,
        // or the JSON parsed value. Let's send the raw strings since they will be compared:
        // `if expected != actual` in comparator.py literally does a direct inequality comparison.
        // Wait, the backend expectation is: `detect_drift(data["terraform"], data["aws"])`
        // Since comparator compares `if expected != actual: drifts.append(...)`, they can be strings or dictionaries. Let's pass the raw string values!
        // Wait, if we send it as string, it's very robust since it guarantees standard string mismatch.
        // But let's check what type the database holds: resource, expected_value, actual_value. These are standard string fields in DB models.
        // Let's pass them as the raw strings.
        const response = await API.post('/drift/check', {
          terraform: expectedVal,
          aws: actualVal
        });

        const resultsCard = document.getElementById('drift-results-card');
        const resultsTbody = document.getElementById('drift-results-tbody');
        const resultsBadge = document.getElementById('drift-results-badge');

        if (!response || response.length === 0) {
          Toast.show('Congratulations! Declared and Deployed infrastructure states match perfectly. No drift detected.', 'success');
          if (resultsCard) resultsCard.style.display = 'none';
        } else {
          Toast.show(`Drift detected! Identified ${response.length} configuration discrepancies.`, 'warning');
          
          if (resultsBadge) resultsBadge.textContent = `${response.length} Drifts`;
          if (resultsTbody) {
            resultsTbody.innerHTML = response.map(drift => `
              <tr>
                <td>${App.severityBadge(drift.severity)}</td>
                <td style="color: var(--text-primary); font-weight: var(--weight-bold);">${escapeHtml(drift.resource)}</td>
                <td style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary);">${escapeHtml(drift.expected)}</td>
                <td style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-critical);">${escapeHtml(drift.actual)}</td>
                <td>
                  <span class="badge badge-dot badge-critical">OUT OF COMPLIANCE</span>
                </td>
              </tr>
            `).join('');
          }
          if (resultsCard) resultsCard.style.display = 'block';
        }

        // Reload drift history timeline logs after drift check
        await loadHistory();

      } catch (error) {
        console.error(error);
        Toast.show('State comparison failed: ' + error.message, 'error');
      } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = originalHTML;
      }
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

document.addEventListener('DOMContentLoaded', Drift.init);
