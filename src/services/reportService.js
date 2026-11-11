import { state } from '../state/store.js';

export function getReportAttendanceForRole() {
  if (!state.session) return [];

  const currentEmployee = state.data.employees.find((employee) => employee.id === state.session.employeeId);
  if (!currentEmployee) return [];

  if (state.session.role === 'Manager') {
    return state.data.attendance.filter((record) => {
      const employeeRecord = state.data.employees.find((employee) => employee.name === record.employee);
      return employeeRecord && employeeRecord.department === currentEmployee.department;
    });
  }

  return state.data.attendance;
}

export function buildMonthlyAttendanceReport(month, role, employeeDepartment) {
  const records = getReportAttendanceForRole().filter((entry) => entry.date.startsWith(month));
  const scope = role === 'Manager' ? `${employeeDepartment} Department` : 'All Employees';

  return { records, scope };
}
