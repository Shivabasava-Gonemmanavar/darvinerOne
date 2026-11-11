import { state } from '../state/store.js';
import { $, escapeHtml } from '../utils/helpers.js';

import { buildNavigation, renderHeader } from './layoutController.js';
import { renderDashboardPage } from './dashboardController.js';
import { renderAttendancePage } from './attendanceController.js';
import { renderLeavePage, openLeave, updateSickDocumentRequirement, decision } from './leaveController.js';
import { renderEmployeePage, openEmployee, editEmployee, viewEmployeeProfile, updateEmployeeStatus, removeEmployee } from './employeeController.js';
import { renderReportsPage } from './reportController.js';
import { renderPayslips } from '../views/payslipsView.js';

const pageMeta = {
  dashboard: ['Dashboard', 'Overview'],
  attendance: ['Attendance', 'Track attendance and working hours'],
  leave: ['Leave Management', 'Manage leave requests'],
  holidays: ['Holidays', 'Company holiday calendar'],
  team: ['Team', 'Team members'],
  approvals: ['Leave Approvals', 'Review leave requests'],
  employees: ['Employees', 'Manage workforce'],
  reports: ['Reports', 'Workforce insights'],
  payslips: ['Salary Slips', 'Monthly salary slips'],
  profile: ['My Profile', 'Your personal details'],
  tickets: ['Issue Tickets', 'Track and resolve workplace issues']
};

function renderHolidaysPage() {
  const app = $('app');
  if (!app) return;

  app.innerHTML = `
    <div class="card">
      <div class="section-head">
        <h3>Company Holidays</h3>
        ${state.session?.role === 'Admin' ? '<button class="btn btn-primary" onclick="openHoliday()">+ Add Holiday</button>' : ''}
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Holiday</th>
              <th>Day</th>
            </tr>
          </thead>
          <tbody>
            ${state.data.holidays.map((holiday) => `
              <tr>
                <td>${new Date(`${holiday.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>${holiday.name}</td>
                <td>${new Date(`${holiday.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProfilePage() {
  const app = $('app');
  const employee = state.data.employees.find((person) => person.id === state.session?.employeeId);
  if (!app || !employee) return;

  const field = (label, value) => `<div><span>${label}</span><strong>${escapeHtml(value || 'Not added')}</strong></div>`;
  app.innerHTML = `
    <div class="card profile-card">
      <div class="section-head"><div><h3>My Profile</h3><p>Employee details on your account</p></div></div>
      <div class="profile-summary">
        ${field('Full Name', employee.name)}
        ${field('Employee ID', employee.id)}
        ${field('Department', employee.department)}
        ${field('Role', employee.role)}
        ${field('Email', employee.email)}
        ${field('Account Status', employee.status || 'Active')}
        ${field('Leave Balance', `${employee.balance ?? 0} days`)}
        ${field('Phone Number', employee.phone)}
        ${field('Blood Group', employee.bloodGroup)}
        <div class="full"><span>Address</span><strong>${escapeHtml(employee.address || 'Not added')}</strong></div>
      </div>
    </div>
  `;
}

function renderTeamPage() {
  const app = $('app');
  if (!app) return;

  const currentEmployee = state.data.employees.find((employee) => employee.id === state.session.employeeId);
  const list = state.session.role === 'Manager'
    ? state.data.employees.filter((employee) => employee.department === currentEmployee.department)
    : state.data.employees;

  app.innerHTML = `
    <div class="card">
      <div class="section-head">
        <h3>${state.session.role === 'Manager' ? 'My Team' : 'All Employees'}</h3>
      </div>
      ${renderEmployeeTable(list)}
    </div>
  `;
}

function renderEmployeeTable(list) {
  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Department</th>
            <th>Role</th>
            <th>Leave Balance</th>
            <th>Profile</th>
            ${['Admin', 'Manager'].includes(state.session?.role) ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${list.map((employee) => `
            <tr>
              <td>${employee.name}<div style="font-size:10px;color:var(--muted)">${employee.email}</div></td>
              <td>${employee.id}</td>
              <td>${employee.department}</td>
              <td>${employee.role}</td>
              <td>${employee.balance} days</td>
              <td><button class="btn btn-secondary btn-sm" onclick="viewEmployeeProfile('${employee.id}')">View Profile</button></td>
              ${['Admin', 'Manager'].includes(state.session?.role) ? `<td><button class="btn btn-secondary btn-sm" onclick="editEmployee('${employee.id}')">Edit</button></td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderApprovalsPage() {
  const app = $('app');
  if (!app) return;

  const currentEmployee = state.data.employees.find((employee) => employee.id === state.session.employeeId);
  const list = state.session.role === 'Manager'
    ? state.data.leaves.filter((entry) => {
        const employee = state.data.employees.find((person) => person.name === entry.employee);
        return employee && employee.department === currentEmployee.department;
      })
    : state.data.leaves;

  app.innerHTML = `
    <div class="card">
      <div class="section-head">
        <h3>Leave Approvals</h3>
      </div>
      ${list.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((entry) => `
              <tr>
                <td>${entry.employee}</td>
                <td>${entry.type}</td>
                <td>${new Date(`${entry.from}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(`${entry.to}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>${entry.days}${entry.lopDays ? ` (${entry.lopDays} LOP)` : ''}</td>
                <td><span class="badge badge-${entry.status === 'Approved' ? 'success' : entry.status === 'Pending' ? 'warning' : 'danger'}">${entry.status}</span></td>
                <td>${entry.status === 'Pending' ? `
                  <button class="btn btn-success btn-sm" onclick="decision(${entry.id}, 'Approved')">Approve</button>
                  <button class="btn btn-danger btn-sm" onclick="decision(${entry.id}, 'Rejected')">Reject</button>` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : '<div class="empty">No requests.</div>'}
    </div>
  `;
}

function renderManagerPayouts() {
  return null;
}

export function setPage(page) {
  state.currentPage = page;
  renderCurrentPage();

  const nav = $('navigation');
  if (nav) {
    nav.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.page === state.currentPage));
  }
}

export function renderCurrentPage() {
  const meta = pageMeta[state.currentPage] || ['Dashboard', 'Overview'];
  const title = $('pageTitle');
  const subtitle = $('pageSubtitle');

  if (title) title.textContent = meta[0];
  if (subtitle) subtitle.textContent = meta[1];

  const renderers = {
    dashboard: renderDashboardPage,
    attendance: renderAttendancePage,
    leave: renderLeavePage,
    holidays: renderHolidaysPage,
    team: renderTeamPage,
    approvals: renderApprovalsPage,
    employees: renderEmployeePage,
    reports: renderReportsPage,
    payslips: renderPayslips,
    profile: renderProfilePage,
    tickets: () => {}
  };

  const renderer = renderers[state.currentPage] || renderDashboardPage;
  renderer();
}

window.setPage = setPage;
window.renderCurrentPage = renderCurrentPage;
window.openLeave = openLeave;
window.updateSickDocumentRequirement = updateSickDocumentRequirement;
window.decision = decision;
window.openEmployee = openEmployee;
window.editEmployee = editEmployee;
window.viewEmployeeProfile = viewEmployeeProfile;
window.updateEmployeeStatus = updateEmployeeStatus;
window.removeEmployee = removeEmployee;
window.openModal = () => {};
window.closeModal = () => {};
window.buildNavigation = buildNavigation;
window.renderHeader = renderHeader;

if (state.session) {
  const loginScreen = $('loginScreen');
  const appShell = $('appShell');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');
  buildNavigation();
  renderHeader();
  renderCurrentPage();
}
