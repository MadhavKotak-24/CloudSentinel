/* ============================================================
   CloudSentinel API Client
   Centralized fetch wrapper with JWT handling, timeouts, loading bars,
   and visual error toaster integrations.
   ============================================================ */

const API = (() => {
  const BASE_URL = 'http://localhost:5000';
  const REQUEST_TIMEOUT_MS = 15000; // 15s timeout
  let activeRequestsCount = 0;

  function getToken() {
    return localStorage.getItem('cs_token');
  }

  function setToken(token) {
    localStorage.setItem('cs_token', token);
  }

  function clearToken() {
    localStorage.removeItem('cs_token');
    localStorage.removeItem('cs_user');
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('cs_user'));
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem('cs_user', JSON.stringify(user));
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  // Visual Top-Viewport Progress Indicator
  function showGlobalLoader() {
    activeRequestsCount++;
    let loader = document.getElementById('global-api-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-api-loader';
      loader.style.position = 'fixed';
      loader.style.top = '0';
      loader.style.left = '0';
      loader.style.height = '3px';
      loader.style.background = 'linear-gradient(90deg, #2563EB, #10B981)';
      loader.style.zIndex = '99999';
      loader.style.transition = 'width 0.3s ease, opacity 0.3s ease';
      loader.style.width = '0%';
      loader.style.opacity = '1';
      document.body.appendChild(loader);
    }
    loader.style.display = 'block';
    loader.style.opacity = '1';
    
    // Animate to initial load state
    requestAnimationFrame(() => {
      if (loader) loader.style.width = '35%';
    });
  }

  function incrementGlobalLoader() {
    let loader = document.getElementById('global-api-loader');
    if (loader) loader.style.width = '75%';
  }

  function hideGlobalLoader() {
    activeRequestsCount--;
    if (activeRequestsCount <= 0) {
      activeRequestsCount = 0;
      let loader = document.getElementById('global-api-loader');
      if (loader) {
        loader.style.width = '100%';
        setTimeout(() => {
          if (activeRequestsCount === 0) {
            loader.style.opacity = '0';
            setTimeout(() => {
              if (activeRequestsCount === 0) {
                loader.style.display = 'none';
                loader.style.width = '0%';
              }
            }, 300);
          }
        }, 200);
      }
    }
  }

  // Central Request Wrapper
  async function request(endpoint, options = {}) {
    showGlobalLoader();
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      ...options.headers,
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (multipart upload)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Set up request timeout AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      incrementGlobalLoader();
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Centralized Status Code Interceptors
      if (response.status === 401) {
        clearToken();
        // Avoid infinite redirects on index.html
        if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
          window.location.href = 'index.html';
        }
        throw new Error('Unauthorized Session. Please sign in again.');
      }

      if (response.status === 404) {
        throw new Error('Requested resource not found on server (404).');
      }

      if (response.status === 500) {
        throw new Error('Internal Server Error. Please contact administrator (500).');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
      }

      hideGlobalLoader();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      hideGlobalLoader();

      // Differentiate Abort limits from normal errors
      if (error.name === 'AbortError') {
        const timeoutMsg = `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`;
        triggerVisualToast(timeoutMsg, 'error');
        throw new Error(timeoutMsg);
      }

      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        const offlineMsg = 'Unable to connect to Flask server. Please check if backend is online at: ' + BASE_URL;
        triggerVisualToast(offlineMsg, 'error');
        throw new Error(offlineMsg);
      }

      // Display all standard exceptions in dynamic Toasters
      triggerVisualToast(error.message, 'error');
      throw error;
    }
  }

  function triggerVisualToast(msg, type = 'error') {
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(msg, type);
    } else {
      console.warn(`[Toast Alert: ${type.toUpperCase()}] ${msg}`);
    }
  }

  function get(endpoint) {
    return request(endpoint, { method: 'GET' });
  }

  function post(endpoint, body) {
    const options = { method: 'POST' };
    if (body instanceof FormData) {
      options.body = body;
    } else if (body) {
      options.body = JSON.stringify(body);
    }
    return request(endpoint, options);
  }

  function upload(endpoint, file, fieldName = 'file') {
    const formData = new FormData();
    formData.append(fieldName, file);
    return post(endpoint, formData);
  }

  // Auth endpoints
  function login(email, password) {
    return post('/auth/login', { email, password });
  }

  function register(username, email, password) {
    return post('/auth/register', { username, email, password });
  }

  function logout() {
    clearToken();
    window.location.href = 'index.html';
  }

  return {
    getToken,
    setToken,
    clearToken,
    getUser,
    setUser,
    isAuthenticated,
    requireAuth,
    get,
    post,
    upload,
    login,
    register,
    logout,
  };
})();

// CENTRAL API LAYER GLOBAL EXPORTS (Requirement 2 & 15)
window.apiGet = API.get;
window.apiPost = API.post;
window.apiUpload = API.upload;
window.API_BASE_URL = 'http://localhost:5000';
