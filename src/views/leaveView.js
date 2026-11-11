import { state, getCurrentEmployee } from '../state/store.js';
import { $, badge, escapeHtml, formatDate } from '../utils/helpers.js';

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
              <td>${entry.days}${entry.lopDays ? ` (${entry.lopDays} LOP)` : ''}</td>
              <td>${badge(entry.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderLeave() {
  const currentEmployee = getCurrentEmployee();
  const records = state.session?.role === 'Employee'
    ? state.data.leaves.filter((entry) => entry.employee === currentEmployee?.name)
    : state.data.leaves;

  const app = $('app');
  if (!app) return;

  app.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <div>
          <h3>Leave Management</h3>
          <p style="font-size:11px;color:var(--muted)">Balance: ${currentEmployee?.balance ?? 0} days</p>
        </div>
        <button class="btn btn-primary" onclick="openLeave()">+ Apply Leave</button>
      </div>
      ${rows(records)}
    </div>
  `;
}
