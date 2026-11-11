import { state } from '../state/store.js';
import { $ } from '../utils/helpers.js';

export function renderReportsPage() {
  const app = $('app');
  if (!app) return;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const attendance = state.data.attendance;
  const present = attendance.filter((entry) => entry.status === 'Present').length;
  const late = attendance.filter((entry) => entry.status === 'Late').length;
  const sick = attendance.filter((entry) => entry.status === 'Sick Leave').length;

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
