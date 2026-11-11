import { state, getCurrentEmployee } from '../state/store.js';
import { $, badge, escapeHtml, formatDate } from '../utils/helpers.js';

export function renderAttendance() {
  const currentEmployee = getCurrentEmployee();
  const records = state.session?.role === 'Employee'
    ? state.data.attendance.filter((entry) => entry.employee === currentEmployee?.name)
    : state.data.attendance;

  const app = $('app');
  if (!app) return;

  app.innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h3>${state.session?.role === 'Employee' ? 'My Attendance' : 'Attendance'}</h3>
          <p>${state.session?.role === 'Employee' ? 'Your daily check-in history' : 'Employee attendance records'}</p>
        </div>
        ${state.session && ['Employee', 'Manager'].includes(state.session.role) ? '<button class="btn btn-primary" onclick="markAttendance()">Mark Attendance</button>' : ''}
      </div>

      ${records.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((entry) => `
                <tr>
                  <td>${escapeHtml(entry.employee)}</td>
                  <td>${formatDate(entry.date)}</td>
                  <td>${badge(entry.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty">No attendance records.</div>'}
    </div>
  `;
}
