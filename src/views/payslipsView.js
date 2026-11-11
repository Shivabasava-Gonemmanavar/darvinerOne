import { state, saveData } from '../state/store.js';
import { $, escapeHtml } from '../utils/helpers.js';

function downloadSlip(slip) {
  const link = document.createElement('a');
  link.href = slip.data;
  link.download = slip.fileName || `Salary_Slip_${slip.month}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function renderPayslips() {
  const app = $('app');
  if (!app || !state.session) return;
  state.data.payslips ||= [];
  const isAdmin = state.session.role === 'Admin';
  const slips = (isAdmin ? state.data.payslips : state.data.payslips.filter((slip) => slip.employeeId === state.session.employeeId))
    .sort((a, b) => b.month.localeCompare(a.month));

  app.innerHTML = `
    ${isAdmin ? `<div class="card" style="margin-bottom:18px">
      <div class="section-head"><div><h3>Upload Salary Slip</h3><p>Choose an employee, month, and PDF slip.</p></div></div>
      <form id="salarySlipForm" class="form-grid">
        <div class="form-group"><label>Employee</label><select name="employeeId" required>${state.data.employees.map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} (${escapeHtml(person.id)})</option>`).join('')}</select></div>
        <div class="form-group"><label>Month</label><input name="month" type="month" required></div>
        <div class="form-group full"><label>Salary slip (PDF)</label><input name="file" type="file" accept="application/pdf,.pdf" required></div>
        <div class="form-group full"><button class="btn btn-primary">Upload Slip</button></div>
      </form>
    </div>` : `<div class="card" style="margin-bottom:18px"><h3>My Salary Slips</h3><p style="font-size:12px;color:var(--muted);margin-top:6px">Only salary slips uploaded for your account are shown here.</p></div>`}
    <div class="card">
      <div class="section-head"><h3>${isAdmin ? 'All Salary Slips' : 'Available Monthly Slips'}</h3></div>
      ${slips.length ? `<div class="table-wrap"><table class="table"><thead><tr>${isAdmin ? '<th>Employee</th>' : ''}<th>Month</th><th>File</th><th>Action</th>${isAdmin ? '<th>Manage</th>' : ''}</tr></thead><tbody>${slips.map((slip) => {
        const employee = state.data.employees.find((person) => person.id === slip.employeeId);
        return `<tr>${isAdmin ? `<td>${escapeHtml(employee?.name || slip.employeeId)}</td>` : ''}<td>${escapeHtml(slip.month)}</td><td>${escapeHtml(slip.fileName)}</td><td><button class="btn btn-secondary btn-sm" data-download-slip="${escapeHtml(slip.id)}">Download</button></td>${isAdmin ? `<td><button class="btn btn-danger btn-sm" data-delete-slip="${escapeHtml(slip.id)}">Delete</button></td>` : ''}</tr>`;
      }).join('')}</tbody></table></div>` : '<div class="empty">No salary slips have been uploaded yet.</div>'}
    </div>`;

  app.querySelectorAll('[data-download-slip]').forEach((button) => button.onclick = () => {
    const slip = state.data.payslips.find((item) => item.id === button.dataset.downloadSlip);
    if (slip) downloadSlip(slip);
  });
  if (isAdmin) {
    app.querySelectorAll('[data-delete-slip]').forEach((button) => button.onclick = () => {
      state.data.payslips = state.data.payslips.filter((item) => item.id !== button.dataset.deleteSlip);
      saveData();
      renderPayslips();
    });
    const form = $('salarySlipForm');
    form.onsubmit = (event) => {
      event.preventDefault();
      const payload = new FormData(form);
      const file = payload.get('file');
      if (!file || file.type !== 'application/pdf') {
        window.alert('Please select a PDF salary slip.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const employeeId = payload.get('employeeId');
        const month = payload.get('month');
        const existingIndex = state.data.payslips.findIndex((item) => item.employeeId === employeeId && item.month === month);
        const slip = { id: `${employeeId}-${month}`, employeeId, month, fileName: file.name, data: reader.result };
        if (existingIndex >= 0) state.data.payslips[existingIndex] = slip;
        else state.data.payslips.push(slip);
        saveData();
        renderPayslips();
      };
      reader.readAsDataURL(file);
    };
  }
}
