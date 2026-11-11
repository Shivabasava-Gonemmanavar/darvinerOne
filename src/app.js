import { state } from './state/store.js';
import { $, toast } from './utils/helpers.js';
import { bindAuthEvents, login, logout, showApp } from './controllers/authController.js';
import { setPage, renderCurrentPage } from './controllers/pageController.js';
import { openLeave, updateSickDocumentRequirement, decision } from './controllers/leaveController.js';
import { openEmployee, viewEmployeeProfile, updateEmployeeStatus, removeEmployee } from './controllers/employeeController.js';
import { markAttendanceHandler } from './controllers/dashboardController.js';
import { buildNavigation, renderHeader } from './controllers/layoutController.js';

function openModal(content) {
  const modal = $('modal');
  const backdrop = $('modalBackdrop');
  if (modal) modal.innerHTML = content;
  if (backdrop) backdrop.classList.remove('hidden');
}

function closeModal() {
  const backdrop = $('modalBackdrop');
  if (backdrop) backdrop.classList.add('hidden');
}

function openHoliday() {
  openModal(`
    <h2>Add Holiday</h2>
    <form id="hf">
      <div class="form-grid">
        <div class="form-group"><label>Date</label><input name="date" type="date" required></div>
        <div class="form-group"><label>Name</label><input name="name" required></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Add</button>
      </div>
    </form>
  `);

  const form = $('hf');
  if (!form) return;

  form.onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    state.data.holidays.push({
      id: Date.now(),
      date: data.get('date'),
      name: data.get('name')
    });
    localStorage.setItem('workflowHR_v2', JSON.stringify(state.data));
    closeModal();
    toast('Holiday added');
    renderCurrentPage();
  };
}

function downloadMonthlyAttendanceReport(month) {
  if (!month) {
    toast('Please select a report month');
    return;
  }

  const records = state.data.attendance.filter((entry) => entry.date.startsWith(month));
  if (!records.length) {
    toast('No attendance records found for the selected month');
    return;
  }

  const rows = records
    .sort((a, b) => a.date.localeCompare(b.date) || a.employee.localeCompare(b.employee))
    .map((entry) => `
      <tr>
        <td>${entry.employee}</td>
        <td>${(state.data.employees.find((person) => person.name === entry.employee) || {}).id || ''}</td>
        <td>${(state.data.employees.find((person) => person.name === entry.employee) || {}).department || ''}</td>
        <td>${entry.date}</td>
        <td>${entry.status}</td>
        <td>${entry.checkIn}</td>
        <td>${entry.checkOut}</td>
      </tr>
    `).join('');

  const htmlReport = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial}th,td{border:1px solid #bfc5d0;padding:8px;text-align:left}th{background:#4f46e5;color:#fff}h1{font-family:Arial;color:#172033}</style></head><body><h1>WorkFlow HR - Monthly Attendance Report</h1><p><b>Month:</b> ${month}<br><b>Scope:</b> All Employees<br><b>Generated:</b> ${new Date().toLocaleString('en-IN')}</p><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  const blob = new Blob([htmlReport], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Attendance_Report_${month}_All_Employees.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('Excel attendance report downloaded');
}

function downloadMonthlyLeaveReport(month) {
  if (!month) return toast('Please select a report month');
  const currentEmployee = state.data.employees.find((person) => person.id === state.session?.employeeId);
  const records = state.data.leaves.filter((leave) => {
    const overlapsMonth = leave.from.slice(0, 7) <= month && leave.to.slice(0, 7) >= month;
    if (!overlapsMonth) return false;
    if (state.session?.role === 'Manager') {
      const employee = state.data.employees.find((person) => person.name === leave.employee);
      return employee?.department === currentEmployee?.department;
    }
    return state.session?.role === 'Admin';
  });
  const rows = records.map((leave) => `<tr><td>${leave.employee}</td><td>${leave.type}</td><td>${leave.from}</td><td>${leave.to}</td><td>${leave.days}</td><td>${leave.lopDays || 0}</td><td>${leave.status}</td></tr>`).join('');
  const scope = state.session?.role === 'Manager' ? `${currentEmployee?.department || ''} Department` : 'All Employees';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial}th,td{border:1px solid #bfc5d0;padding:8px;text-align:left}th{background:#4f46e5;color:#fff}</style></head><body><h1>WorkFlow HR - Monthly Leave Report</h1><p>Month: ${month}<br>Scope: ${scope}</p><table><thead><tr><th>Employee</th><th>Leave Type</th><th>From</th><th>To</th><th>Working Days</th><th>LOP Days</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No leave records found</td></tr>'}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Leave_Report_${month}_${state.session?.role === 'Manager' ? 'Department' : 'All_Employees'}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('Excel leave report downloaded');
}

window.toast = toast;
window.showApp = showApp;
window.login = login;
window.logout = logout;
window.setPage = setPage;
window.renderCurrentPage = renderCurrentPage;
window.openLeave = openLeave;
window.updateSickDocumentRequirement = updateSickDocumentRequirement;
window.decision = decision;
window.markAttendance = markAttendanceHandler;
window.openEmployee = openEmployee;
window.viewEmployeeProfile = viewEmployeeProfile;
window.updateEmployeeStatus = updateEmployeeStatus;
window.removeEmployee = removeEmployee;
window.openModal = openModal;
window.closeModal = closeModal;
window.openHoliday = openHoliday;
window.downloadMonthlyAttendanceReport = downloadMonthlyAttendanceReport;
window.downloadMonthlyLeaveReport = downloadMonthlyLeaveReport;
window.buildNavigation = buildNavigation;
window.renderHeader = renderHeader;

bindAuthEvents();

if (state.session) {
  showApp();
}
