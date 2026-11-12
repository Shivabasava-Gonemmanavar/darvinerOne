import { state } from '../state/store.js';
import { getTodayISO } from '../utils/helpers.js';
import { api, refreshBootstrap } from './apiClient.js';

export function getMyAttendanceToday() {
  if (!state.session) return null;
  const employee = state.data.employees.find((item) => item.id === state.session.employeeId);
  if (!employee) return null;

  return state.data.attendance.find((record) => record.employee === employee.name && record.date === getTodayISO()) || null;
}

export async function markAttendance(mode = 'check-in') {
  if (!state.session) return { ok: false, message: 'No active session' };

  const employee = state.data.employees.find((item) => item.id === state.session.employeeId);
  if (!employee) return { ok: false, message: 'Employee not found' };

  try {
    if (mode === 'check-out') await api('/attendance/check-out', { method: 'POST' });
    else {
      const existing = getMyAttendanceToday();
      if (existing) return { ok: false, message: 'Attendance is already marked for today' };
      await api('/attendance/check-in', { method: 'POST' });
    }
    await refreshBootstrap();
    return { ok: true, message: mode === 'check-out' ? 'Check-out recorded successfully' : 'Attendance marked successfully' };
  } catch (error) { return { ok: false, message: error.message }; }
}

export function getAttendanceForCurrentUser() {
  if (!state.session) return [];
  const employee = state.data.employees.find((item) => item.id === state.session.employeeId);
  if (!employee) return [];

  return state.data.attendance.filter((record) => record.employee === employee.name);
}

export function getReportAttendance() {
  if (!state.session) return [];
  const currentUser = state.data.employees.find((employee) => employee.id === state.session.employeeId);

  if (state.session.role === 'Manager') {
    return state.data.attendance.filter((record) => {
      const employee = state.data.employees.find((item) => item.name === record.employee);
      return employee && employee.department === currentUser.department;
    });
  }

  return state.data.attendance;
}
