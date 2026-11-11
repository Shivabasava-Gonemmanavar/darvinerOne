import { state } from '../state/store.js';
import { $, escapeHtml } from '../utils/helpers.js';

function monthLabel(monthValue) {
  if (!monthValue) return '';
  return new Date(`${monthValue}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function renderReports() {
  const app = $('app');
  if (!app) return;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const records = state.data.attendance;
  const present = records.filter((entry) => entry.status === 'Present').length;
  const late = records.filter((entry) => entry.status === 'Late').length;
  const sick = records.filter((entry) => entry.status === 'Sick Leave').length;

  app.innerHTML = `
    <div class="grid stats-grid">
      <div class="card stat">
        <div>
          <div class="label">Employees</div>
          <h2>${state.data.employees.length}</h2>
        </div>
        <div class="stat-icon">♙</div>
      </div>
      <div class="card stat">
        <div>
          <div class="label">Present</div>
          <h2>${present}</h2>
        </div>
        <div class="stat-icon">✓</div>
      </div>
      <div class="card stat">
        <div>
          <div class="label">Late</div>
          <h2>${late}</h2>
        </div>
        <div class="stat-icon">◷</div>
      </div>
      <div class="card stat">
        <div>
          <div class="label">Sick Leave</div>
          <h2>${sick}</h2>
        </div>
        <div class="stat-icon">!</div>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div>
          <h3>Monthly Attendance Report</h3>
          <p style="font-size:12px;color:var(--muted);margin-top:4px">Download attendance for this reporting period.</p>
        </div>
        <div class="actions"><button class="btn btn-secondary" onclick="downloadMonthlyLeaveReport(document.getElementById('reportMonth').value)">Download Leave Report</button><button class="btn btn-primary" onclick="downloadMonthlyAttendanceReport(document.getElementById('reportMonth').value)">Download Attendance Report</button></div>
      </div>
      <div class="form-grid" style="max-width:340px;margin-top:18px">
        <div class="form-group">
          <label>Report month</label>
          <input id="reportMonth" type="month" value="${currentMonth}" max="${currentMonth}">
        </div>
      </div>
    </div>
  `;
}

export function downloadMonthlyAttendanceReport(month) {
  if (!month) {
    window.toast?.('Please select a report month');
    return;
  }

  const records = state.data.attendance.filter((entry) => entry.date.startsWith(month));
  if (!records.length) {
    window.toast?.('No attendance records found for the selected month');
    return;
  }

  const rows = records
    .sort((a, b) => a.date.localeCompare(b.date) || a.employee.localeCompare(b.employee))
    .map((entry) => {
      const employee = state.data.employees.find((person) => person.name === entry.employee) || {};
      return `
        <tr>
          <td>${escapeHtml(entry.employee)}</td>
          <td>${escapeHtml(employee.id || '')}</td>
          <td>${escapeHtml(employee.department || '')}</td>
          <td>${escapeHtml(entry.date)}</td>
          <td>${escapeHtml(entry.status)}</td>
          <td>${escapeHtml(entry.checkIn)}</td>
          <td>${escapeHtml(entry.checkOut)}</td>
        </tr>
      `;
    }).join('');

  const htmlReport = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial}th,td{border:1px solid #bfc5d0;padding:8px;text-align:left}th{background:#4f46e5;color:#fff}h1{font-family:Arial;color:#172033}</style></head><body><h1>WorkFlow HR - Monthly Attendance Report</h1><p><b>Month:</b> ${escapeHtml(monthLabel(month))}<br><b>Scope:</b> All Employees<br><b>Generated:</b> ${escapeHtml(new Date().toLocaleString('en-IN'))}</p><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  const blob = new Blob([htmlReport], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Attendance_Report_${month}_All_Employees.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  window.toast?.('Excel attendance report downloaded');
}
