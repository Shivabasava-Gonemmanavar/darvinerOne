import { state } from '../state/store.js';
import { $, escapeHtml } from '../utils/helpers.js';
import { api, refreshAndRender } from '../services/apiClient.js';

export function renderTickets() {
  const app = $('app');
  if (!app) return;
  const canManage = ['Admin', 'Manager'].includes(state.session?.role);
  const tickets = state.data.tickets || [];
  app.innerHTML = `
    <div class="card" style="margin-bottom:18px">
      <div class="section-head"><div><h3>Report a workplace issue</h3><p>Submit an issue for your HR or management team.</p></div></div>
      <form id="ticketForm" class="form-grid">
        <div class="form-group"><label>Subject</label><input name="subject" minlength="3" maxlength="180" required></div>
        <div class="form-group"><label>Priority</label><select name="priority"><option>Normal</option><option>Low</option><option>High</option></select></div>
        <div class="form-group full"><label>Details</label><textarea name="description" rows="3" maxlength="5000" required></textarea></div>
        <div class="form-group full"><button class="btn btn-primary">Submit Issue</button></div>
      </form>
    </div>
    <div class="card"><div class="section-head"><h3>${canManage ? 'Team Issues' : 'My Issues'}</h3></div>
      ${tickets.length ? `<div class="table-wrap"><table class="table"><thead><tr>${canManage ? '<th>Employee</th>' : ''}<th>Subject</th><th>Priority</th><th>Status</th><th>Reported</th>${canManage ? '<th>Update</th>' : ''}</tr></thead><tbody>
      ${tickets.map((ticket) => `<tr>${canManage ? `<td>${escapeHtml(ticket.employee)}</td>` : ''}<td><strong>${escapeHtml(ticket.subject)}</strong><div style="font-size:11px;color:var(--muted)">${escapeHtml(ticket.description)}</div></td><td>${escapeHtml(ticket.priority)}</td><td>${escapeHtml(ticket.status)}</td><td>${escapeHtml(new Date(ticket.createdAt).toLocaleDateString('en-IN'))}</td>${canManage ? `<td>${ticket.status !== 'Resolved' ? `<button class="btn btn-secondary btn-sm" data-ticket-id="${ticket.id}" data-ticket-status="${ticket.status === 'Open' ? 'In Progress' : 'Resolved'}">${ticket.status === 'Open' ? 'Start' : 'Resolve'}</button>` : '—'}</td>` : ''}</tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">No issues have been reported.</div>'}
    </div>`;

  $('ticketForm').onsubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await api('/tickets', { method: 'POST', body: JSON.stringify(payload) }); await refreshAndRender(); window.toast?.('Issue submitted'); }
    catch (error) { window.toast?.(error.message); }
  };
  app.querySelectorAll('[data-ticket-id]').forEach((button) => button.onclick = async () => {
    try { await api(`/tickets/${button.dataset.ticketId}`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.ticketStatus }) }); await refreshAndRender(); }
    catch (error) { window.toast?.(error.message); }
  });
}
