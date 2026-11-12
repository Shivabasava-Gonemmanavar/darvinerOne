import { state } from '../state/store.js';
import { $, toast, escapeHtml } from '../utils/helpers.js';
import { renderEmployees } from '../views/employeeView.js';
import { createEmployeeAccount, removeEmployeeAccount, updateAccountStatus, updateEmployeeDetails } from '../services/employeeService.js';

export function renderEmployeePage() {
  renderEmployees();
}

export function openEmployee() {
  const modal = $('modal');
  const backdrop = $('modalBackdrop');
  if (!modal || !backdrop) return;

  modal.innerHTML = `
    <h2>Add Employee & Login</h2>
    <form id="ef">
      <div class="form-grid">
        <div class="form-group"><label>Employee ID</label><input name="id" placeholder="e.g. EMP005" required></div>
        <div class="form-group"><label>Full Name</label><input name="name" required></div>
        <div class="form-group"><label>Department</label><input name="department" required></div>
        <div class="form-group"><label>Role</label><select name="role"><option>Employee</option><option>Manager</option><option>Admin</option></select></div>
        <div class="form-group"><label>Email / Login ID</label><input name="email" type="email" required></div>
      <div class="form-group"><label>Initial Password</label><input name="password" type="password" minlength="12" placeholder="Minimum 12 characters" required></div>
        <div class="form-group"><label>Phone Number</label><input name="phone" type="tel"></div>
        <div class="form-group"><label>Blood Group</label><input name="bloodGroup" placeholder="e.g. O+"></div>
        <div class="form-group full"><label>Address</label><input name="address"></div>
        <div class="form-group full"><label>Leave Balance</label><input name="balance" type="number" value="18" min="0" required></div>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:12px">The email and initial password will be used by this employee to sign in.</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Create Employee</button>
      </div>
    </form>
  `;

  backdrop.classList.remove('hidden');

  const form = $('ef');
  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();
    const payload = new FormData(event.target);
    const result = await createEmployeeAccount({
      id: payload.get('id'),
      name: payload.get('name'),
      department: payload.get('department'),
      role: payload.get('role'),
      email: payload.get('email'),
      password: payload.get('password'),
      phone: payload.get('phone'),
      bloodGroup: payload.get('bloodGroup'),
      address: payload.get('address'),
      balance: payload.get('balance')
    });

    if (!result.ok) {
      toast(result.message);
      return;
    }

    if (typeof window.closeModal === 'function') window.closeModal();
    toast('Employee and login account created');
    const { renderCurrentPage } = window;
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
  };
}

export function editEmployee(employeeId) {
  if (!state.session || !['Admin', 'Manager'].includes(state.session.role)) return;
  const employee = state.data.employees.find((entry) => entry.id === employeeId);
  if (!employee) {
    toast('Employee not found');
    return;
  }

  const isAdmin = state.session.role === 'Admin';
  const modal = $('modal');
  const backdrop = $('modalBackdrop');
  if (!modal || !backdrop) return;

  modal.innerHTML = `
    <h2>Edit Employee Details</h2>
    <form id="editEmployeeForm">
      <div class="form-grid">
        <div class="form-group"><label>Employee ID</label><input value="${escapeHtml(employee.id)}" readonly></div>
        <div class="form-group"><label>Full Name</label><input name="name" value="${escapeHtml(employee.name)}" required></div>
        <div class="form-group"><label>Department</label><input ${isAdmin ? 'name="department"' : 'readonly'} value="${escapeHtml(employee.department)}" required></div>
        <div class="form-group"><label>Role</label>${isAdmin ? `<select name="role"><option ${employee.role === 'Employee' ? 'selected' : ''}>Employee</option><option ${employee.role === 'Manager' ? 'selected' : ''}>Manager</option><option ${employee.role === 'Admin' ? 'selected' : ''}>Admin</option></select>` : `<input value="${escapeHtml(employee.role)}" readonly>`}</div>
        <div class="form-group"><label>Email / Login ID</label><input name="email" type="email" value="${escapeHtml(employee.email)}" required></div>
        <div class="form-group"><label>Phone Number</label><input name="phone" type="tel" value="${escapeHtml(employee.phone || '')}"></div>
        <div class="form-group"><label>Blood Group</label><input name="bloodGroup" value="${escapeHtml(employee.bloodGroup || '')}"></div>
        <div class="form-group"><label>Leave Balance</label><input name="balance" type="number" min="0" step="1" value="${Number(employee.balance) || 0}" required></div>
        <div class="form-group full"><label>Address</label><input name="address" value="${escapeHtml(employee.address || '')}"></div>
        ${isAdmin ? `<div class="form-group"><label>Status</label><select name="status"><option ${employee.status !== 'Inactive' ? 'selected' : ''}>Active</option><option ${employee.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div>` : ''}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `;
  backdrop.classList.remove('hidden');

  const form = $('editEmployeeForm');
  form.onsubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const result = await updateEmployeeDetails(employeeId, payload);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    if (typeof window.closeModal === 'function') window.closeModal();
    if (typeof window.renderHeader === 'function') window.renderHeader();
    toast('Employee details updated');
    if (typeof window.renderCurrentPage === 'function') window.renderCurrentPage();
  };
}

export function viewEmployeeProfile(employeeId) {
  const employee = state.data.employees.find((entry) => entry.id === employeeId);
  if (!employee) {
    toast('Employee profile not found');
    return;
  }

  const modal = $('modal');
  const backdrop = $('modalBackdrop');
  if (!modal || !backdrop) return;

  modal.innerHTML = `
    <h2>Employee Profile</h2>
    <div class="profile-summary">
      <div><span>Employee</span><strong>${escapeHtml(employee.name)}</strong></div>
      <div><span>Employee ID</span><strong>${escapeHtml(employee.id)}</strong></div>
      <div><span>Department</span><strong>${escapeHtml(employee.department)}</strong></div>
      <div><span>Role</span><strong>${escapeHtml(employee.role)}</strong></div>
      <div><span>Email</span><strong>${escapeHtml(employee.email)}</strong></div>
      <div><span>Account Status</span><strong>${escapeHtml(employee.status || 'Active')}</strong></div>
      <div><span>Leave Balance</span><strong>${escapeHtml(`${employee.balance ?? 0} days`)}</strong></div>
      <div><span>Phone Number</span><strong>${escapeHtml(employee.phone || 'Not added')}</strong></div>
      <div><span>Blood Group</span><strong>${escapeHtml(employee.bloodGroup || 'Not added')}</strong></div>
      <div class="full"><span>Address</span><strong>${escapeHtml(employee.address || 'Not added')}</strong></div>
    </div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  `;

  backdrop.classList.remove('hidden');
}

export async function updateEmployeeStatus(employeeId, status) {
  const result = await updateAccountStatus(employeeId, status);
  if (!result.ok) {
    toast(result.message);
    return;
  }

  const { renderCurrentPage } = window;
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

export async function removeEmployee(employeeId) {
  if (!window.confirm('Delete this employee and their login account?')) return;
  const deletingCurrentUser = state.session?.employeeId === employeeId;
  const result = await removeEmployeeAccount(employeeId);
  if (!result.ok) {
    toast(result.message);
    return;
  }

  if (deletingCurrentUser) {
    if (typeof window.logout === 'function') window.logout();
    return;
  }

  const { renderCurrentPage } = window;
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}
