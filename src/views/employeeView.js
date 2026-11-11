import { state } from '../state/store.js';
import { $, badge, escapeHtml } from '../utils/helpers.js';

export function renderEmployees() {
  const app = $('app');
  if (!app) return;

  app.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h3>Employee Management</h3>
        <button class="btn btn-primary" onclick="openEmployee()">+ Add Employee</button>
      </div>
      ${employeeTable(state.data.employees)}
    </div>
  `;
}

export function employeeTable(list) {
  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Department</th>
            <th>Role</th>
            <th>Status</th>
            <th>Leave Balance</th>
            <th>Profile</th>
            ${['Admin', 'Manager'].includes(state.session?.role) ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${list.map((employee) => `
            <tr>
              <td>${escapeHtml(employee.name)}<div style="font-size:10px;color:var(--muted)">${escapeHtml(employee.email)}</div></td>
              <td>${escapeHtml(employee.id)}</td>
              <td>${escapeHtml(employee.department)}</td>
              <td>${escapeHtml(employee.role)}</td>
              <td>${badge(employee.status || 'Active')}</td>
              <td>${employee.balance} days</td>
              <td><button class="btn btn-secondary btn-sm" onclick="viewEmployeeProfile('${employee.id}')">View Profile</button></td>
              ${['Admin', 'Manager'].includes(state.session?.role) ? `<td><button class="btn btn-secondary btn-sm" onclick="editEmployee('${employee.id}')">Edit</button> ${state.session.role === 'Admin' ? `<button class="btn btn-danger btn-sm" onclick="removeEmployee('${employee.id}')">Delete</button>` : ''}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
