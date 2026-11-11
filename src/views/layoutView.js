import { $ } from '../utils/helpers.js';
import { state } from '../state/store.js';

export function buildNavigation() {
  const items = [
    ['dashboard', '▦', 'Dashboard'],
    ['attendance', '◷', state.session?.role === 'Employee' ? 'My Attendance' : 'Attendance'],
    ['payslips', '▤', state.session?.role === 'Admin' ? 'Salary Slips' : 'My Salary Slips'],
    ['leave', '☑', state.session?.role === 'Employee' ? 'My Leave' : 'Leave Management'],
    ['holidays', '▣', 'Holidays']
  ];

  if (state.session?.role !== 'Employee') items.push(['team', '♙', 'Team']);
  if (state.session?.role === 'Manager' || state.session?.role === 'Admin') items.push(['approvals', '✓', 'Leave Approvals']);
  if (state.session?.role === 'Admin') items.push(['employees', '♙', 'Employees'], ['reports', '▤', 'Reports']);
  if (state.session?.role === 'Manager') items.push(['reports', '▤', 'Reports']);

  const nav = $('navigation');
  if (!nav) return;

  nav.innerHTML = items.map(([page, icon, label]) => `
    <button class="nav-item" data-page="${page}">${icon} <span>${label}</span></button>
  `).join('');

  nav.querySelectorAll('button').forEach((button) => {
    button.onclick = () => {
      state.currentPage = button.dataset.page;
      nav.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === state.currentPage));
      window.renderPage();
      if (window.innerWidth < 760) {
        const sidebar = $('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      }
    };
  });

  const activeButton = nav.querySelector(`[data-page="${state.currentPage}"]`);
  if (activeButton) activeButton.classList.add('active');
}

export function renderHeader() {
  const employee = state.data.employees.find((item) => item.id === state.session?.employeeId);
  if (!employee || !state.session) return;

  const initials = employee.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const sideName = $('sideName');
  const sideRole = $('sideRole');
  const topName = $('topName');
  const sideAvatar = $('sideAvatar');
  const topAvatar = $('topAvatar');

  if (sideName) sideName.textContent = employee.name.split(' ')[0];
  if (sideRole) sideRole.textContent = state.session.role;
  if (topName) topName.textContent = employee.name;
  if (sideAvatar) sideAvatar.textContent = initials;
  if (topAvatar) topAvatar.textContent = initials;
}
