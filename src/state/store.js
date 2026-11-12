export const state = {
  data: { employees: [], leaves: [], holidays: [], attendance: [], payslips: [], policies: [], tickets: [] },
  session: null,
  currentPage: 'dashboard'
};

// Workflow records and authentication are server-owned. These compatibility
// helpers intentionally do not persist application data in the browser.
export function saveData() {}
export function saveUsers() {}
export function saveSession() {}

export function getCurrentEmployee() {
  if (!state.session) return null;
  return state.data.employees.find((employee) => employee.id === state.session.employeeId) || null;
}

export function getCurrentUser() {
  return state.session;
}
