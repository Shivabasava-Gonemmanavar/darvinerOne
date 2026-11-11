import { state, saveData, saveUsers, saveSession } from '../state/store.js';

export function getEmployeesForView() {
  if (!state.session) return [];
  const current = state.data.employees.find((employee) => employee.id === state.session.employeeId);

  if (state.session.role === 'Manager') {
    return state.data.employees.filter((employee) => employee.department === current.department);
  }

  return state.data.employees;
}

export function createEmployeeAccount(payload) {
  const { id, name, department, role, email, password, phone, bloodGroup, address, balance } = payload;

  if (state.data.employees.some((employee) => employee.id.toLowerCase() === String(id).trim().toLowerCase())) {
    return { ok: false, message: 'Employee ID already exists' };
  }

  if (state.users.some((user) => user.email === String(email).trim().toLowerCase()) || state.data.employees.some((employee) => employee.email.toLowerCase() === String(email).trim().toLowerCase())) {
    return { ok: false, message: 'Email address already exists' };
  }

  if (String(password).length < 6) {
    return { ok: false, message: 'Password must contain at least 6 characters' };
  }

  const employee = {
    id: String(id).trim().toUpperCase(),
    name: String(name).trim(),
    department: String(department).trim(),
    role,
    email: String(email).trim().toLowerCase(),
    phone: String(phone || '').trim(),
    bloodGroup: String(bloodGroup || '').trim(),
    address: String(address || '').trim(),
    status: 'Active',
    balance: Number(balance) || 0
  };

  state.data.employees.push(employee);
  state.users.push({
    email: employee.email,
    password: String(password),
    role: employee.role,
    employeeId: employee.id
  });

  saveData();
  saveUsers();
  return { ok: true, employee };
}

export function updateAccountStatus(employeeId, status) {
  const employee = state.data.employees.find((item) => item.id === employeeId);
  if (!employee) return { ok: false, message: 'Employee not found' };

  employee.status = status;
  saveData();
  return { ok: true };
}

export function updateEmployeeDetails(employeeId, payload) {
  if (!state.session || !['Admin', 'Manager'].includes(state.session.role)) {
    return { ok: false, message: 'You do not have permission to edit employee details' };
  }

  const employee = state.data.employees.find((item) => item.id === employeeId);
  if (!employee) return { ok: false, message: 'Employee not found' };

  const currentEmployee = state.data.employees.find((item) => item.id === state.session.employeeId);
  if (state.session.role === 'Manager' && (!currentEmployee || employee.department !== currentEmployee.department)) {
    return { ok: false, message: 'Managers can edit employees in their own department only' };
  }

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) return { ok: false, message: 'Email is required' };
  if (state.data.employees.some((item) => item.id !== employeeId && item.email.toLowerCase() === email)) {
    return { ok: false, message: 'Email address already exists' };
  }

  const account = state.users.find((user) => user.employeeId === employeeId);
  if (state.users.some((user) => user.employeeId !== employeeId && user.email === email)) {
    return { ok: false, message: 'Email address already exists' };
  }

  const name = String(payload.name || '').trim();
  const balance = Number(payload.balance);
  if (!name || !Number.isFinite(balance) || balance < 0) {
    return { ok: false, message: 'Enter a valid name and leave balance' };
  }

  let department = employee.department;
  let role = employee.role;
  let status = employee.status || 'Active';
  if (state.session.role === 'Admin') {
    department = String(payload.department || '').trim();
    role = String(payload.role || employee.role);
    status = String(payload.status || employee.status || 'Active');
    if (!department || !['Employee', 'Manager', 'Admin'].includes(role) || !['Active', 'Inactive'].includes(status)) {
      return { ok: false, message: 'Enter valid department, role, and status details' };
    }
    if (state.session.employeeId === employeeId && role !== state.session.role) {
      return { ok: false, message: 'You cannot change your own access role' };
    }
  }

  const oldName = employee.name;
  Object.assign(employee, {
    name,
    email,
    phone: String(payload.phone || '').trim(),
    bloodGroup: String(payload.bloodGroup || '').trim(),
    address: String(payload.address || '').trim(),
    balance,
    department,
    role,
    status
  });

  if (account) {
    account.email = email;
    account.role = employee.role;
  }
  if (oldName !== employee.name) {
    state.data.leaves.forEach((leave) => { if (leave.employee === oldName) leave.employee = employee.name; });
    state.data.attendance.forEach((entry) => { if (entry.employee === oldName) entry.employee = employee.name; });
  }
  if (state.session.employeeId === employeeId) {
    state.session.email = email;
    state.session.role = employee.role;
    saveSession();
  }

  saveData();
  saveUsers();
  return { ok: true, employee };
}

export function removeEmployeeAccount(employeeId) {
  const employee = state.data.employees.find((item) => item.id === employeeId);
  if (!employee) return { ok: false, message: 'Employee not found' };

  state.data.employees = state.data.employees.filter((item) => item.id !== employeeId);
  state.users = state.users.filter((user) => user.employeeId !== employeeId);
  state.data.payslips = state.data.payslips.filter((entry) => entry.employeeId !== employeeId);
  state.data.tickets = state.data.tickets.filter((entry) => entry.employeeId !== employeeId && entry.managerId !== employeeId);

  saveData();
  saveUsers();
  return { ok: true, employee };
}
