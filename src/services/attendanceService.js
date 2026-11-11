import { state, saveData } from '../state/store.js';
import { getTodayISO } from '../utils/helpers.js';

export function getMyAttendanceToday() {
  if (!state.session) return null;
  const employee = state.data.employees.find((item) => item.id === state.session.employeeId);
  if (!employee) return null;

  return state.data.attendance.find((record) => record.employee === employee.name && record.date === getTodayISO()) || null;
}

export function markAttendance() {
  if (!state.session) return { ok: false, message: 'No active session' };

  const employee = state.data.employees.find((item) => item.id === state.session.employeeId);
  if (!employee) return { ok: false, message: 'Employee not found' };

  const existing = getMyAttendanceToday();
  if (existing) {
    return { ok: false, message: 'Attendance is already marked for today' };
  }

  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  state.data.attendance.unshift({
    date: getTodayISO(),
    employee: employee.name,
    status: 'Present',
    checkIn: time,
    checkOut: '--'
  });

  saveData();
  return { ok: true, message: 'Attendance marked successfully' };
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
