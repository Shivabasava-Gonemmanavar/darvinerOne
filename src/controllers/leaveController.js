import { state, getCurrentEmployee } from '../state/store.js';
import { $, toast, escapeHtml } from '../utils/helpers.js';
import { renderLeave } from '../views/leaveView.js';
import { applyLeave, updateLeaveDecision, workingLeaveDays, hasWeekendDate } from '../services/leaveService.js';

export function renderLeavePage() {
  renderLeave();
}

export function openLeave() {
  const employee = getCurrentEmployee();
  if (!employee) return;

  const modal = $('modal');
  const backdrop = $('modalBackdrop');
  if (!modal || !backdrop) return;

  modal.innerHTML = `
    <h2>Apply for Leave</h2>
    <form id="lf">
      <div class="form-grid">
        <div class="form-group full"><label>Employee</label><input name="employee" value="${escapeHtml(employee.name)}" readonly></div>
        <div class="form-group"><label>Type</label><select name="type" onchange="updateSickDocumentRequirement()"><option>Paid Leave</option><option>Sick Leave</option><option>Maternity Leave</option><option>Paternity Leave</option></select></div>
        <div class="form-group"><label>From</label><input name="from" type="date" onchange="updateSickDocumentRequirement()" required></div>
        <div class="form-group"><label>To</label><input name="to" type="date" onchange="updateSickDocumentRequirement()" required></div>
        <div class="form-group full"><label>Reason</label><input name="reason" required></div>
        <div class="form-group full hidden" id="sickDocumentGroup"><label>Supporting document</label><input name="document" type="file" accept="application/pdf,image/*,.pdf" aria-describedby="sickLeaveRule"><small id="sickLeaveRule">For more than 3 working days of Sick Leave, supporting documents are required.</small></div>
      </div>
      <p class="leave-rule" id="leaveBalanceInfo">Remaining leave balance: ${employee.balance} days</p>
      <p class="leave-rule">For more than 3 working days of Sick Leave, supporting documents are required. Saturdays, Sundays, and company holidays are excluded.</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Submit</button>
      </div>
    </form>
  `;

  backdrop.classList.remove('hidden');

  const form = $('lf');
  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();
    const payload = new FormData(event.target);
    const employeeName = payload.get('employee');
    const type = payload.get('type');
    const from = payload.get('from');
    const to = payload.get('to');
    const reason = payload.get('reason');
    const documentFile = payload.get('document');

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    if (hasWeekendDate(from, to)) {
      window.alert('Leave cannot be applied on Saturday and Sunday');
      return;
    }
    if (end < start) {
      toast('Invalid date range');
      return;
    }

    const requiredDocument = type === 'Sick Leave' && workingLeaveDays(from, to) > 3 && !(documentFile && documentFile.size);
    if (requiredDocument) {
      toast('Supporting document is required for Sick Leave over 3 working days');
      return;
    }

    let documentData = '';
    let documentName = '';

    if (documentFile && documentFile.size) {
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = () => {
          documentData = reader.result;
          documentName = documentFile.name;
          resolve();
        };
        reader.readAsDataURL(documentFile);
      });
    }

    const result = await applyLeave({ type, from, to, reason, documentName, documentData });
    if (!result.ok) {
      toast(result.message);
      return;
    }

    const closeModalFn = window.closeModal;
    if (typeof closeModalFn === 'function') closeModalFn();
    toast(type === 'Sick Leave' ? 'Sick Leave submitted; attendance updated' : 'Leave submitted');
    const { renderCurrentPage } = window;
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
  };
}

export function updateSickDocumentRequirement() {
  const form = $('lf');
  if (!form) return;

  const sick = form.type.value === 'Sick Leave';
  const days = workingLeaveDays(form.from.value, form.to.value);
  const required = sick && days > 3;
  const group = $('sickDocumentGroup');
  const input = form.querySelector('[name="document"]');

  if (group) group.classList.toggle('hidden', !required);
  if (input) input.required = required;
}
export async function decision(leaveId, status) {
  const result = await updateLeaveDecision(leaveId, status);
  if (!result.ok) {
    toast(result.message);
    return;
  }

  toast('Leave ' + status.toLowerCase());
  const { renderCurrentPage } = window;
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}
