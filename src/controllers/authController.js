import { state } from '../state/store.js';
import { $ } from '../utils/helpers.js';
import { loginUser, logoutUser } from '../services/authService.js';
import { buildNavigation, renderHeader } from './layoutController.js';
import { renderCurrentPage } from './pageController.js';

export function showApp() {
  const loginScreen = $('loginScreen');
  const appShell = $('appShell');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');

  buildNavigation();
  renderHeader();
  renderCurrentPage();
}

export async function login() {
  const email = $('email').value.trim().toLowerCase();
  const password = $('password').value;
  const result = await loginUser({ email, password });

  if (!result.ok) {
    const errorBox = $('loginError');
    if (errorBox) errorBox.textContent = result.message;
    return;
  }

  showApp();
}

export async function logout() {
  await logoutUser();

  const appShell = $('appShell');
  const loginScreen = $('loginScreen');
  const form = $('loginForm');
  const error = $('loginError');

  if (appShell) appShell.classList.add('hidden');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (form) form.reset();
  if (error) error.textContent = '';
}

export function bindAuthEvents() {
  window.closeUserMenu = () => {
    const menu = $('userDropdown');
    const button = $('topUser');
    if (menu) menu.classList.add('hidden');
    if (button) button.setAttribute('aria-expanded', 'false');
  };

  const form = $('loginForm');
  if (form) {
    form.onsubmit = (event) => {
      event.preventDefault();
      login();
    };
  }

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = logout;

  const menuBtn = $('menuBtn');
  if (menuBtn) menuBtn.onclick = () => {
    const sidebar = $('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  };

  const topUser = $('topUser');
  if (topUser) {
    topUser.onclick = () => {
      const menu = $('userDropdown');
      const open = menu ? menu.classList.toggle('hidden') : false;
      topUser.setAttribute('aria-expanded', String(!open));
    };
  }

  const backdrop = $('modalBackdrop');
  if (backdrop) {
    backdrop.onclick = (event) => {
      if (event.target.id === 'modalBackdrop') {
        const { closeModal } = window;
        if (typeof closeModal === 'function') closeModal();
      }
    };
  }

  document.addEventListener('click', (event) => {
    const userMenuWrap = event.target.closest('.user-menu-wrap');
    const userDropdown = $('userDropdown');
    const topUserButton = $('topUser');

    if (!userMenuWrap && userDropdown && topUserButton) {
      userDropdown.classList.add('hidden');
      topUserButton.setAttribute('aria-expanded', 'false');
    }
  });

}
