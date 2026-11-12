import { state } from '../state/store.js';
import { api, refreshBootstrap } from './apiClient.js';

export async function loginUser({ email, password }) {
  try {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    state.session = result.user;
    await refreshBootstrap();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message || 'Unable to sign in.' };
  }
}

export async function logoutUser() {
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* Clear the local UI even if the server is unavailable. */ }
  state.session = null;
  state.data = { employees: [], leaves: [], holidays: [], attendance: [], payslips: [], policies: [], tickets: [] };
}

export function getCurrentRole() { return state.session?.role || null; }
export function isAllowedRole(roles) {
  const role = getCurrentRole();
  return Array.isArray(roles) ? roles.includes(role) : role === roles;
}
export function getCurrentEmployeeName() { return state.data.employees.find((e) => e.id === state.session?.employeeId)?.name || ''; }
