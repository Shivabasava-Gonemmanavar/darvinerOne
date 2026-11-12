import { state } from '../state/store.js';
import { api, refreshBootstrap } from './apiClient.js';

export function workingLeaveDays(from, to) {
  if (!from || !to || to < from) return 0;
  let count = 0;
  for (let day = new Date(`${from}T12:00:00`); day <= new Date(`${to}T12:00:00`); day.setDate(day.getDate() + 1)) {
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    if (day.getDay() !== 0 && day.getDay() !== 6 && !state.data.holidays.some((holiday) => holiday.date === key)) count += 1;
  }
  return count;
}

export function hasWeekendDate(from, to) {
  if (!from || !to || to < from) return false;
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return start.getDay() === 0 || start.getDay() === 6 || end.getDay() === 0 || end.getDay() === 6;
}

export function getLeaveBalance(employeeCode) {
  return state.data.employees.find((employee) => employee.id === employeeCode)?.balance || 0;
}

export async function applyLeave({ type, from, to, reason, documentName = '', documentData = '' }) {
  try {
    const { data } = await api('/leaves', { method: 'POST', body: JSON.stringify({ type, from, to, reason, documentName, documentData }) });
    await refreshBootstrap();
    return { ok: true, leave: data };
  } catch (error) { return { ok: false, message: error.message }; }
}

export async function updateLeaveDecision(leaveId, status) {
  try {
    const action = status === 'Approved' ? 'approve' : 'reject';
    await api(`/leaves/${encodeURIComponent(leaveId)}/${action}`, { method: 'POST' });
    await refreshBootstrap();
    return { ok: true };
  } catch (error) { return { ok: false, message: error.message }; }
}
