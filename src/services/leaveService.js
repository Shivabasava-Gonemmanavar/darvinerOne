import { state, saveData } from '../state/store.js';
import { getTodayISO } from '../utils/helpers.js';

export function workingLeaveDays(from, to) {
  if (!from || !to) return 0;

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const isHoliday = state.data.holidays.some((holiday) => holiday.date === dateKey);

    if (!isWeekend && !isHoliday) count += 1;
  }

  return count;
}

export function hasWeekendDate(from, to) {
  if (!from || !to) return false;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return false;
  const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
  return isWeekend(start) || isWeekend(end);
}

export function getLeaveBalance(employeeName) {
  const employee = state.data.employees.find((item) => item.name === employeeName);
  return employee ? employee.balance : 0;
}

export function applyLeave({ employee, type, from, to, reason, documentName = '', documentData = '' }) {
  const employeeRecord = state.data.employees.find((item) => item.name === employee);
  if (!employeeRecord) return { ok: false, message: 'Employee not found' };

  if (!from || !to) return { ok: false, message: 'Missing leave dates' };

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  if (end < start) return { ok: false, message: 'Invalid date range' };

  if (hasWeekendDate(from, to)) return { ok: false, message: 'Leave cannot be applied on Saturday and Sunday' };

  const workingDays = workingLeaveDays(from, to);
  if (!workingDays) return { ok: false, message: 'No working days selected' };

  if (type === 'Sick Leave' && workingDays > 3 && !documentData && !documentName) {
    return { ok: false, message: 'Supporting document is required for Sick Leave over 3 working days' };
  }

  const requestedDaysByMonth = {};
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    if (state.data.holidays.some((holiday) => holiday.date === dateKey)) continue;
    const month = dateKey.slice(0, 7);
    requestedDaysByMonth[month] = (requestedDaysByMonth[month] || 0) + 1;
  }
  const alreadyTakenByMonth = {};
  for (const existing of state.data.leaves) {
    if (existing.employee !== employeeRecord.name || existing.status !== 'Approved') continue;
    const existingStart = new Date(`${existing.from}T00:00:00`);
    const existingEnd = new Date(`${existing.to}T00:00:00`);
    for (let day = new Date(existingStart); day <= existingEnd; day.setDate(day.getDate() + 1)) {
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      if (state.data.holidays.some((holiday) => holiday.date === dateKey)) continue;
      alreadyTakenByMonth[dateKey.slice(0, 7)] = (alreadyTakenByMonth[dateKey.slice(0, 7)] || 0) + 1;
    }
  }
  let paidDays = 0;
  let lopDays = 0;
  for (const [month, days] of Object.entries(requestedDaysByMonth)) {
    const availablePaidDays = Math.max(0, 18 - (alreadyTakenByMonth[month] || 0));
    const monthPaidDays = Math.min(days, availablePaidDays);
    paidDays += monthPaidDays;
    lopDays += days - monthPaidDays;
  }

  if (paidDays > employeeRecord.balance) {
    return { ok: false, message: 'Insufficient leave balance' };
  }

  const leave = {
    id: Date.now(),
    employee: employeeRecord.name,
    type,
    from,
    to,
    days: workingDays,
    paidDays,
    lopDays,
    status: 'Pending',
    reason,
    documentName,
    documentData
  };

  state.data.leaves.unshift(leave);
  saveData();
  return { ok: true, leave };
}

export function updateLeaveDecision(leaveId, status) {
  const leave = state.data.leaves.find((entry) => entry.id === leaveId);
  if (!leave) return { ok: false, message: 'Leave not found' };

  leave.status = status;

  if (status === 'Approved') {
    const employee = state.data.employees.find((item) => item.name === leave.employee);
    if (employee) {
      employee.balance = Math.max(0, employee.balance - (leave.paidDays ?? leave.days));
    }
  }

  saveData();
  return { ok: true, leave };
}
