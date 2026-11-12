import { state, getCurrentEmployee } from '../state/store.js';
import { $, toast, escapeHtml, getTodayISO } from '../utils/helpers.js';
import { markAttendance } from '../services/attendanceService.js';
import { renderDashboard } from '../views/dashboardView.js';

export function renderDashboardPage() {
  renderDashboard();
}

export async function markAttendanceHandler(mode = 'check-in') {
  const result = await markAttendance(mode);
  if (!result.ok) {
    toast(result.message);
    return;
  }

  toast(result.message);
  renderDashboardPage();
}
