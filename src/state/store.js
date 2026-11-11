import { defaultData, defaultUsers } from '../config/defaultData.js';

const STORAGE_KEYS = {
  users: 'workflowUsers_v2',
  data: 'workflowHR_v2',
  session: 'workflowSession'
};

function readJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export const state = {
  users: readJson(STORAGE_KEYS.users, structuredClone(defaultUsers)),
  data: readJson(STORAGE_KEYS.data, structuredClone(defaultData)),
  session: readJson(STORAGE_KEYS.session, null),
  currentPage: 'dashboard'
};

export function saveUsers() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(state.users));
}

export function saveData() {
  localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(state.data));
}

export function saveSession() {
  if (state.session) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(state.session));
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.session);
}

export function getCurrentEmployee() {
  if (!state.session) return null;
  return state.data.employees.find((employee) => employee.id === state.session.employeeId) || null;
}

export function getCurrentUser() {
  if (!state.session) return null;
  return state.users.find((user) => user.email === state.session.email) || null;
}
