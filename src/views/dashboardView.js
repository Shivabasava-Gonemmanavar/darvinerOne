import { state, getCurrentEmployee } from '../state/store.js';
import { $ , badge, escapeHtml, formatDate, getTodayISO, getISTGreeting } from '../utils/helpers.js';

function rows(list) {
  if (!list.length) return '<div class="empty">No records found.</div>';

  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((entry) => `
            <tr>
              <td>${escapeHtml(entry.employee)}</td>
              <td>${escapeHtml(entry.type)}</td>
              <td>${formatDate(entry.from)}</td>
              <td>${formatDate(entry.to)}</td>
              <td>${entry.days}</td>
              <td>${badge(entry.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function attendanceAction() {
  if (!state.session || !['Employee', 'Manager'].includes(state.session.role)) return '';

  const employee = getCurrentEmployee();
  const record = state.data.attendance.find((entry) => entry.employee === employee.name && entry.date === getTodayISO());

  if (record) {
    return '<button class="btn btn-secondary" disabled>Marked at ' + record.checkIn + '</button>';
  }

  return '<button class="btn btn-primary" onclick="markAttendance()">' + (state.session.role === 'Manager' ? 'Mark Manager Attendance' : 'Mark My Attendance') + '</button>';
}

export function renderDashboard() {
  const currentEmployee = getCurrentEmployee();
  const todayRecords = state.data.attendance.filter((entry) => entry.date === getTodayISO());
  const present = todayRecords.filter((entry) => ['Present', 'Late'].includes(entry.status)).length;
  const leaveRecords = state.session?.role === 'Employee'
    ? state.data.leaves.filter((entry) => entry.employee === currentEmployee?.name)
    : state.data.leaves;

  const app = $('app');
  if (!app) return;

  app.innerHTML = `
    <div class="grid stats-grid">
      <div class="card stat">
        <div>
          <div class="label">${state.session?.role === 'Employee' ? 'My Leave Balance' : 'Total Employees'}</div>
          <h2>${state.session?.role === 'Employee' ? currentEmployee.balance : state.data.employees.length}</h2>
        </div>
        <div class="stat-icon">☑</div>
      </div>
      <div class="card stat">
        <div>
          <div class="label">Present Today</div>
          <h2>${present}</h2>
        </div>
        <div class="stat-icon">✓</div>
      </div>
      <div class="card stat">
        <div>
          <div class="label">Pending Leaves</div>
          <h2>${leaveRecords.filter((entry) => entry.status === 'Pending').length}</h2>
        </div>
        <div class="stat-icon">◷</div>
      </div>
      <div class="card stat">
        <div>
          <div class="label">Holidays</div>
          <h2>${state.data.holidays.length}</h2>
        </div>
        <div class="stat-icon">▣</div>
      </div>
    </div>

    <div class="grid two-col">
      <div class="card hero">
        <h2>${getISTGreeting()}, ${escapeHtml(currentEmployee.name.split(' ')[0])} 👋</h2>
        <p>Welcome to your ${state.session.role.toLowerCase()} workspace.</p>
        <div class="actions" style="margin-top:18px">
          ${attendanceAction()}
          <button class="btn" onclick="openLeave()">Apply Leave</button>
          <button class="btn" onclick="setPage('attendance')">View Attendance</button>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <h3>Today's Attendance</h3>
        </div>
        <p style="font-size:12px">${present} of ${state.data.employees.length} employees present</p>
        <div class="progress" style="margin-top:12px">
          <span style="width:${Math.min(100, (present / state.data.employees.length) * 100)}%"></span>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px">
      <div class="section-head"><h3>Recent Leave Activity</h3></div>
      ${rows(leaveRecords.slice(0, 5))}
    </div>
  `;
}
