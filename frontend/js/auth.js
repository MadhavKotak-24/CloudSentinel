/* ============================================================
   CloudSentinel Auth Module
   Login / Register / Forgot Password logic with premium visibility toggles
   ============================================================ */

const Auth = (() => {
  // Modes: 'login', 'register', 'forgot'
  let currentMode = 'login';

  function init() {
    // If already authenticated, redirect to dashboard
    if (API.isAuthenticated()) {
      window.location.href = 'dashboard.html';
      return;
    }

    bindEvents();
    Theme.init();
  }

  function bindEvents() {
    const form = document.getElementById('auth-form');
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    // Dynamic show/hide password visibility toggle eyeball
    document.getElementById('btn-toggle-password')?.addEventListener('click', togglePasswordVisibility);

    // Dynamic forgot password link trigger
    document.getElementById('btn-forgot-password')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchMode('forgot');
    });

    // Toggle links bindings
    setupToggleLinks();
  }

  function setupToggleLinks() {
    const link = document.getElementById('auth-toggle-link');
    if (!link) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentMode === 'login') {
        switchMode('register');
      } else {
        switchMode('login');
      }
    });
  }

  function switchMode(mode) {
    currentMode = mode;
    clearErrors();

    const titleEl = document.getElementById('auth-form-title');
    const subEl = document.getElementById('auth-form-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const userGroup = document.getElementById('username-group');
    const emailGroup = document.getElementById('email-group');
    const passGroup = document.getElementById('password-group');
    const footerRow = document.getElementById('auth-footer-row');
    const toggleText = document.getElementById('auth-toggle-text');

    if (!titleEl || !subEl || !submitBtn) return;

    // Reset password visibility
    const passInput = document.getElementById('auth-password');
    if (passInput) {
      passInput.type = 'password';
      updateEyeballIcon(false);
    }

    if (mode === 'login') {
      titleEl.textContent = 'Welcome back';
      subEl.textContent = 'Sign in to your CloudSentinel account';
      submitBtn.textContent = 'Sign In';
      
      userGroup?.classList.add('hidden');
      emailGroup?.classList.remove('hidden');
      passGroup?.classList.remove('hidden');
      footerRow?.classList.remove('hidden');
      
      if (toggleText) {
        toggleText.innerHTML = `Don't have an account? <a href="#" id="auth-toggle-link">Create one</a>`;
      }
    } else if (mode === 'register') {
      titleEl.textContent = 'Create account';
      subEl.textContent = 'Get started with CloudSentinel enterprise tier';
      submitBtn.textContent = 'Create Account';
      
      userGroup?.classList.remove('hidden');
      emailGroup?.classList.remove('hidden');
      passGroup?.classList.remove('hidden');
      footerRow?.classList.add('hidden'); // No forgot password in register
      
      if (toggleText) {
        toggleText.innerHTML = `Already have an account? <a href="#" id="auth-toggle-link">Sign in</a>`;
      }
    } else if (mode === 'forgot') {
      titleEl.textContent = 'Recover password';
      subEl.textContent = 'Enter your email to receive recovery instructions';
      submitBtn.textContent = 'Send Recovery Instructions';
      
      userGroup?.classList.add('hidden');
      emailGroup?.classList.remove('hidden');
      passGroup?.classList.add('hidden');
      footerRow?.classList.add('hidden');
      
      if (toggleText) {
        toggleText.innerHTML = `Back to <a href="#" id="auth-toggle-link">Sign In</a>`;
      }
    }

    // Rebind toggle link
    setupToggleLinks();
  }

  function togglePasswordVisibility() {
    const input = document.getElementById('auth-password');
    if (!input) return;

    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    updateEyeballIcon(!isPass);
  }

  function updateEyeballIcon(isVisible) {
    const btn = document.getElementById('btn-toggle-password');
    if (!btn) return;

    if (isVisible) {
      // Slashed eye path
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      // Normal eye path
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearErrors();

    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!emailInput || !submitBtn) return;

    const email = emailInput.value.trim();
    
    // 1. Validation email
    if (!validateEmail(email)) {
      showError('Please enter a valid business email address');
      return;
    }

    // 2. Mode specifically validations
    if (currentMode !== 'forgot') {
      const password = passwordInput.value;
      if (!password || password.length < 6) {
        showError('Password must contain at least 6 characters');
        return;
      }

      submitBtn.classList.add('btn-loading');
      submitBtn.disabled = true;

      try {
        if (currentMode === 'login') {
          // Login
          const data = await API.login(email, password);
          if (data.token) {
            API.setToken(data.token);
            API.setUser({ email, username: data.username || email.split('@')[0] });
            Toast.show('Welcome back! Authing session successful.', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 800);
          } else {
            throw new Error('Authentication failed: Missing token in server response');
          }
        } else {
          // Register
          const usernameInput = document.getElementById('auth-username');
          const username = usernameInput?.value.trim();
          if (!username || username.length < 3) {
            showError('Username must contain at least 3 characters');
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
            return;
          }

          await API.register(username, email, password);
          Toast.show('Registration successful! Please sign in.', 'success');
          switchMode('login');
        }
      } catch (error) {
        console.error(error);
        showError(error.message || 'Authentication failed. Please verify credentials.');
      } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
      }
    } else {
      // Forgot password request simulator
      submitBtn.classList.add('btn-loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        Toast.show(`Recovery link generated for: ${email}. Please check your inbox.`, 'success');
        switchMode('login');
      }, 1000);
    }
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  function showError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function clearErrors() {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Auth.init);
