/* ============================================================
   CloudSentinel App Initialization
   Loads shared components, sets up navigation, global handlers
   ============================================================ */

const App = (() => {
  async function init(currentPage) {
    // Auth guard
    if (!API.requireAuth()) return;

    // Load shared components
    await loadComponent('sidebar-container', 'components/sidebar.html');
    await loadComponent('topbar-container', 'components/topbar.html');

    // Highlight active nav item
    setActiveNav(currentPage);

    // Setup global badges and user info
    setupUserInfo();
    setupGlobalBadges();

    // Setup global handlers
    setupMobileMenu();
    setupProfileDropdown();
    setupLogout();
    setupSearch();

    // Init theme
    Theme.init();

    // Init toast container
    Toast.init();

    // Page enter animation
    const main = document.querySelector('.main-content');
    if (main) {
      main.classList.add('page-enter');
      requestAnimationFrame(() => {
        main.classList.add('page-enter-active');
        main.classList.remove('page-enter');
      });
    }
  }

  async function loadComponent(containerId, url) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
      const response = await fetch(url);
      if (response.ok) {
        container.innerHTML = await response.text();
      }
    } catch (e) {
      console.warn(`Failed to load component: ${url}`, e);
    }
  }

  function setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === page) {
        item.classList.add('active');
      }
    });
  }

  function setupUserInfo() {
    const user = API.getUser();
    if (user) {
      const initial = (user.email || user.username || 'U')[0].toUpperCase();
      const name = user.username || user.email || 'User';

      const sidebarAvatar = document.getElementById('sidebar-avatar');
      const sidebarName = document.getElementById('sidebar-user-name');
      const topbarAvatar = document.getElementById('topbar-avatar');

      if (sidebarAvatar) sidebarAvatar.textContent = initial;
      if (sidebarName) sidebarName.textContent = name;
      if (topbarAvatar) topbarAvatar.textContent = initial;
    }
  }

  async function setupGlobalBadges() {
    const badge = document.getElementById('findings-count');
    if (!badge) return;

    try {
      const data = await API.get('/findings/all');
      if (data && Array.isArray(data)) {
        badge.textContent = data.length;
      }
    } catch (e) {
      console.warn('Unable to load findings count badge globally:', e.message);
    }
  }

  function setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
      });
    }
  }

  function setupProfileDropdown() {
    const trigger = document.getElementById('profile-trigger');
    const menu = document.getElementById('profile-menu');

    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      });

      document.addEventListener('click', () => {
        menu.classList.remove('open');
      });
    }
  }

  function setupLogout() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#logout-btn')) {
        API.logout();
      }
    });
  }

  function setupSearch() {
    // Ctrl/Cmd+K shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const search = document.getElementById('global-search');
        if (search) search.focus();
      }
    });
  }

  // Utility: animate counter
  function animateCounter(element, target, duration = 1000) {
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;

    function step() {
      current += increment;
      if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
        element.textContent = target.toLocaleString();
        return;
      }
      element.textContent = Math.round(current).toLocaleString();
      requestAnimationFrame(step);
    }
    step();
  }

  // Utility: format date
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Utility: severity badge HTML
  function severityBadge(severity) {
    const s = (severity || '').toUpperCase();
    const cls = {
      CRITICAL: 'badge-critical',
      HIGH: 'badge-high',
      MEDIUM: 'badge-medium',
      LOW: 'badge-low',
    }[s] || 'badge-info';
    return `<span class="badge badge-dot ${cls}">${s}</span>`;
  }

  // Utility: create skeleton rows
  function skeletonRows(count = 5, cols = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += '<td><div class="skeleton skeleton-text" style="width: ' + (60 + Math.random() * 30) + '%"></div></td>';
      }
      html += '</tr>';
    }
    return html;
  }

  return {
    init,
    loadComponent,
    animateCounter,
    formatDate,
    severityBadge,
    skeletonRows,
  };
})();
