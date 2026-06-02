/* ============================================================
   CloudSentinel Chart Factory
   Reusable Chart.js configurations with active theme synchronization
   ============================================================ */

const Charts = (() => {
  // Global active instances registry
  const instances = new Set();

  function register(chart) {
    instances.add(chart);
    return chart;
  }

  function unregister(chart) {
    instances.delete(chart);
  }

  function destroyAll() {
    instances.forEach(chart => {
      try {
        chart.destroy();
      } catch (e) {
        console.warn('Error destroying chart', e);
      }
    });
    instances.clear();
  }

  // Shared defaults matching variables.css
  const COLORS = {
    primary: '#2563EB',
    primaryLight: 'rgba(37, 99, 235, 0.15)',
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    critical: '#EF4444',
    criticalLight: 'rgba(239, 68, 68, 0.15)',
    high: '#F97316',
    highLight: 'rgba(249, 115, 22, 0.15)',
    info: '#6366F1',
    infoLight: 'rgba(99, 102, 241, 0.15)',
    gray: '#64748B',
  };

  const SEVERITY_COLORS = {
    CRITICAL: COLORS.critical,
    HIGH: COLORS.high,
    MEDIUM: COLORS.warning,
    LOW: COLORS.success,
  };

  const SEVERITY_BG = {
    CRITICAL: COLORS.criticalLight,
    HIGH: COLORS.highLight,
    MEDIUM: COLORS.warningLight,
    LOW: COLORS.successLight,
  };

  function getTextColor() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'light' ? '#334155' : '#E2E8F0';
  }

  function getGridColor() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(248, 250, 252, 0.08)';
  }

  function baseOptions(overrides = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getTextColor(),
            font: { family: "'Inter', -apple-system, sans-serif", size: 12, weight: 500 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { family: "'Inter', -apple-system, sans-serif", weight: 600, size: 13 },
          bodyFont: { family: "'Inter', -apple-system, sans-serif", size: 12 },
          displayColors: true,
          boxPadding: 6,
        },
      },
      ...overrides,
    };
  }

  /**
   * Severity Doughnut Chart
   */
  function createSeverityDoughnut(ctx, data) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(l => SEVERITY_COLORS[l] || COLORS.gray),
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: baseOptions({
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getTextColor(),
              font: { family: "'Inter', -apple-system, sans-serif", size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
        },
      }),
    });
    return register(chart);
  }

  /**
   * Bar Chart
   */
  function createBarChart(ctx, labels, datasets) {
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label || `Dataset ${i + 1}`,
          data: ds.data,
          backgroundColor: ds.color || COLORS.primary,
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
          ...ds,
        })),
      },
      options: baseOptions({
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: getTextColor(), font: { family: "'Inter', -apple-system, sans-serif", size: 11 } },
          },
          y: {
            grid: { color: getGridColor() },
            ticks: { color: getTextColor(), font: { family: "'Inter', -apple-system, sans-serif", size: 11 } },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: {
              color: getTextColor(),
              font: { family: "'Inter', -apple-system, sans-serif", size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
        },
      }),
    });
    return register(chart);
  }

  /**
   * Line Chart
   */
  function createLineChart(ctx, labels, datasets) {
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label || `Dataset ${i + 1}`,
          data: ds.data,
          borderColor: ds.color || COLORS.primary,
          backgroundColor: ds.bg || COLORS.primaryLight,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: ds.color || COLORS.primary,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          borderWidth: 2,
          ...ds,
        })),
      },
      options: baseOptions({
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: getTextColor(), font: { family: "'Inter', -apple-system, sans-serif", size: 11 } },
          },
          y: {
            grid: { color: getGridColor() },
            ticks: { color: getTextColor(), font: { family: "'Inter', -apple-system, sans-serif", size: 11 } },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: {
              color: getTextColor(),
              font: { family: "'Inter', -apple-system, sans-serif", size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
        },
      }),
    });
    return register(chart);
  }

  /**
   * Horizontal Bar Chart
   */
  function createHorizontalBar(ctx, labels, data, colors) {
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors || labels.map((_, i) =>
            [COLORS.primary, COLORS.success, COLORS.warning, COLORS.critical, COLORS.info][i % 5]
          ),
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
        }],
      },
      options: baseOptions({
        indexAxis: 'y',
        scales: {
          x: {
            grid: { color: getGridColor() },
            ticks: { color: getTextColor(), font: { family: "'Inter', -apple-system, sans-serif", size: 11 } },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { color: getTextColor(), font: { family: "'Inter', -apple-system, sans-serif", size: 11 } },
          },
        },
        plugins: {
          legend: { display: false },
        },
      }),
    });
    return register(chart);
  }

  // Update theme configurations across all active charts
  function updateThemeForAll() {
    const textColor = getTextColor();
    const gridColor = getGridColor();

    instances.forEach(chart => {
      if (!chart || !chart.options) return;

      // Update legend font colors
      if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      // Update axes scales grids and labels colors
      if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach(scaleKey => {
          const scale = chart.options.scales[scaleKey];
          if (scale.ticks) {
            scale.ticks.color = textColor;
          }
          if (scale.grid) {
            scale.grid.color = gridColor;
          }
        });
      }

      chart.update();
    });
  }

  return {
    COLORS,
    SEVERITY_COLORS,
    SEVERITY_BG,
    createSeverityDoughnut,
    createBarChart,
    createLineChart,
    createHorizontalBar,
    getTextColor,
    getGridColor,
    register,
    unregister,
    destroyAll,
    updateThemeForAll,
  };
})();
