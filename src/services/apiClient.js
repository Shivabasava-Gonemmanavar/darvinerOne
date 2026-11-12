import { state } from '../state/store.js';

const API_ROOT = '/api/v1';

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const payload = contentType.includes('application/json') ? await response.json() : null;
    if (response.status === 401 && !path.endsWith('/auth/login') && !path.endsWith('/auth/logout')) {
      state.session = null;
      state.data = { employees: [], leaves: [], holidays: [], attendance: [], payslips: [], policies: [], tickets: [] };
      document.getElementById('appShell')?.classList.add('hidden');
      document.getElementById('loginScreen')?.classList.remove('hidden');
    }
    throw new Error(payload?.error?.message || `Request failed (${response.status})`);
  }
  if (response.status === 204 || !contentType.includes('application/json')) return response;
  return response.json();
}

export async function refreshBootstrap() {
  const data = await api('/bootstrap');
  state.data = {
    employees: data.employees || [],
    leaves: data.leaves || [],
    attendance: data.attendance || [],
    holidays: data.holidays || [],
    payslips: data.payslips || [],
    policies: [],
    tickets: data.tickets || []
  };
  if (data.user) state.session = data.user;
  return state.data;
}

export async function refreshAndRender() {
  await refreshBootstrap();
  window.renderHeader?.();
  window.renderCurrentPage?.();
}
