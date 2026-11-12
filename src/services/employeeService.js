import { state } from '../state/store.js';
import { api, refreshBootstrap } from './apiClient.js';

export function getEmployeesForView() { return state.data.employees; }

export async function createEmployeeAccount(payload) {
  try {
    const { data } = await api('/employees', { method: 'POST', body: JSON.stringify(payload) });
    await refreshBootstrap();
    return { ok: true, employee: data };
  } catch (error) { return { ok: false, message: error.message }; }
}

export async function updateAccountStatus(employeeId, status) {
  const employee = state.data.employees.find((item) => item.id === employeeId);
  if (!employee) return { ok: false, message: 'Employee not found' };
  return updateEmployeeDetails(employeeId, { ...employee, status });
}

export async function updateEmployeeDetails(employeeId, payload) {
  try {
    const { data } = await api(`/employees/${encodeURIComponent(employeeId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
    await refreshBootstrap();
    return { ok: true, employee: data };
  } catch (error) { return { ok: false, message: error.message }; }
}

export async function removeEmployeeAccount(employeeId) {
  try {
    await api(`/employees/${encodeURIComponent(employeeId)}`, { method: 'DELETE' });
    await refreshBootstrap();
    return { ok: true };
  } catch (error) { return { ok: false, message: error.message }; }
}
