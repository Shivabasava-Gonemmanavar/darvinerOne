import { state } from '../state/store.js';
import { $, escapeHtml } from '../utils/helpers.js';
import { api, refreshAndRender } from '../services/apiClient.js';

async function downloadSlip(slip) {
  const response = await api(`/payslips/${encodeURIComponent(slip.id)}/download`);
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = slip.fileName || `Salary_Slip_${slip.month}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
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

  app.querySelectorAll('[data-download-slip]').forEach((button) => button.onclick = async () => {
    const slip = state.data.payslips.find((item) => item.id === button.dataset.downloadSlip);
    if (slip) {
      try { await downloadSlip(slip); }
      catch (error) { window.toast?.(error.message); }
    }
  });
  if (isAdmin) {
    app.querySelectorAll('[data-delete-slip]').forEach((button) => button.onclick = async () => {
      try { await api(`/payslips/${encodeURIComponent(button.dataset.deleteSlip)}`, { method: 'DELETE' }); await refreshAndRender(); }
      catch (error) { window.toast?.(error.message); }
    });
    const form = $('salarySlipForm');
    form.onsubmit = async (event) => {
      event.preventDefault();
      const payload = new FormData(form);
      const file = payload.get('file');
      if (!file || file.type !== 'application/pdf') {
        window.alert('Please select a PDF salary slip.');
        return;
      }
      try {
        await api('/payslips', { method: 'POST', body: payload });
        await refreshAndRender();
        window.toast?.('Salary slip uploaded');
      } catch (error) { window.toast?.(error.message); }
    };
  }
}
