/* ============================================================
   CloudSentinel Theme Manager
   Dark / Light mode toggle with persistence
   ============================================================ */

const Theme = (() => {
  const STORAGE_KEY = 'cs_theme';

  function get() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function set(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
    if (typeof Charts !== 'undefined' && Charts.updateThemeForAll) {
      Charts.updateThemeForAll();
    }
  }

  function toggle() {
    const current = get();
    const next = current === 'dark' ? 'light' : 'dark';
    set(next);
    return next;
  }

  function init() {
    const theme = get();
    document.documentElement.setAttribute('data-theme', theme);

    // Bind toggle buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-toggle');
      if (btn) {
        toggle();
      }
    });

    updateToggleIcon(theme);
  }

  function updateToggleIcon(theme) {
    const toggles = document.querySelectorAll('.theme-toggle-knob');
    toggles.forEach(knob => {
      knob.innerHTML = theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    });
  }

  return { init, get, set, toggle };
})();
