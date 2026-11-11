import { state, saveSession, getCurrentEmployee } from '../state/store.js';

export function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '').trim();
  const user = state.users.find((entry) => entry.email === normalizedEmail && entry.password === normalizedPassword);

  if (!user) {
    return { ok: false, message: 'Invalid email or password' };
  }

  const employee = state.data.employees.find((entry) => entry.id === user.employeeId);
  if (!employee || employee.status !== 'Active') {
    return { ok: false, message: 'Your account is inactive. Please contact HR or an administrator.' };
  }

  state.session = {
    email: user.email,
    role: user.role,
    employeeId: user.employeeId
  };

  saveSession();
  return { ok: true, employee };
}

export function logoutUser() {
  state.session = null;
  saveSession();
}

export function getCurrentRole() {
  return state.session?.role || null;
}

export function isAllowedRole(roles) {
  const role = getCurrentRole();
  return Array.isArray(roles) ? roles.includes(role) : role === roles;
}

export function getCurrentEmployeeName() {
  return getCurrentEmployee()?.name || '';
}
