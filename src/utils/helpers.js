export const $ = (id) => document.getElementById(id);

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function getTodayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export function getISTGreeting() {
  const hourPart = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).find((part) => part.type === 'hour');
  const hour = Number(hourPart?.value);

  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function badge(status) {
  const palette = {
    Approved: 'success',
    Present: 'success',
    Active: 'success',
    Pending: 'warning',
    Late: 'warning',
    'Sick Leave': 'warning',
    Rejected: 'danger',
    Absent: 'danger'
  };

  const className = palette[status] || 'neutral';
  return `<span class="badge badge-${className}">${escapeHtml(status)}</span>`;
}

export function toast(message) {
  const container = $('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => el.remove(), 2400);
}

export function buildInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
