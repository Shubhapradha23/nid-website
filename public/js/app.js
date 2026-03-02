/**
 * NID Cut-off Website - Frontend App
 */

const API = '/api';

// State
let cutoffChart = null;

// DOM
const authScreen = document.getElementById('auth-screen');
const dashboard = document.getElementById('dashboard');
const authMessage = document.getElementById('auth-message');
const userDisplay = document.getElementById('user-display');
const adminScreen = document.getElementById('admin-screen');

// Helpers
function showAuthMessage(msg, type = '') {
  authMessage.textContent = msg;
  authMessage.className = type;
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// Generate username on client (same logic as backend)
function generateUsernameClient(firstName, lastName, batchYear) {
  const first = (firstName || '').slice(0, 4).toLowerCase().padEnd(4, 'x');
  const batch = String(batchYear || '').replace(/\D/g, '').slice(0, 4) || '0000';
  const last = (lastName || '').slice(-2).toLowerCase().padStart(2, 'x');
  return `${first}-${batch}@${last}`;
}

// Auth
async function checkAuth() {
  try {
    const me = await api('GET', '/auth/me');
    showDashboard(me);
    return true;
  } catch {
    // Not logged in as a student, leave auth screen visible
    authScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
    adminScreen.classList.add('hidden');
    return false;
  }
}

function showDashboard(me) {
  authScreen.classList.add('hidden');
  adminScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  userDisplay.textContent = me.username || 'User';
  loadPage('preferences');
}

function showAdminDashboard() {
  authScreen.classList.add('hidden');
  dashboard.classList.add('hidden');
  adminScreen.classList.remove('hidden');
  loadAdminUsers();
}

// Auth Tabs
document.querySelectorAll('#auth-tabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#auth-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    document.getElementById('admin-login-form').classList.toggle('hidden', tab !== 'admin');
    showAuthMessage('');
  });
});

// Auto-generate username while typing (until user edits username manually)
(() => {
  const form = document.getElementById('register-form');
  if (!form) return;
  const firstInput = form.querySelector('input[name="firstName"]');
  const lastInput = form.querySelector('input[name="lastName"]');
  const batchInput = form.querySelector('input[name="batchYear"]');
  const usernameInput = form.querySelector('input[name="username"]');
  if (!firstInput || !lastInput || !batchInput || !usernameInput) return;

  let usernameTouched = false;

  usernameInput.addEventListener('input', () => {
    // Once user starts typing, we stop auto-overwriting
    usernameTouched = true;
  });

  function maybeUpdateUsername() {
    if (usernameTouched) return;
    const suggested = generateUsernameClient(
      firstInput.value,
      lastInput.value,
      batchInput.value
    );
    usernameInput.value = suggested;
  }

  firstInput.addEventListener('input', maybeUpdateUsername);
  lastInput.addEventListener('input', maybeUpdateUsername);
  batchInput.addEventListener('input', maybeUpdateUsername);
})();

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    showAuthMessage('Logging in...');
    const data = await api('POST', '/auth/login', {
      username: fd.get('username'),
      password: fd.get('password')
    });
    showAuthMessage(data.message || 'Login successful', 'success');
    setTimeout(() => checkAuth(), 500);
  } catch (err) {
    showAuthMessage(err.message, 'error');
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get('email');
  if (!email.toLowerCase().endsWith('@nid.edu')) {
    showAuthMessage('Only @nid.edu email addresses are allowed', 'error');
    return;
  }
  if (fd.get('password') !== fd.get('confirmPassword')) {
    showAuthMessage('Password and Confirm password do not match', 'error');
    return;
  }
  try {
    const regForm = document.getElementById('register-form');
    const firstName = fd.get('firstName');
    const lastName = fd.get('lastName');
    const batchYear = fd.get('batchYear');
    let username = (fd.get('username') || '').trim();
    if (!username) {
      username = generateUsernameClient(firstName, lastName, batchYear);
      // Also reflect it back into the input so user sees it
      const usernameInput = regForm.querySelector('input[name="username"]');
      if (usernameInput) usernameInput.value = username;
    }

    showAuthMessage('Registering...');
    const data = await api('POST', '/auth/register', {
      firstName,
      lastName,
      batchYear,
      username,
      email,
      password: fd.get('password'),
      confirmPassword: fd.get('confirmPassword')
    });
    showAuthMessage(data.message || 'Account created! Your username: ' + data.username, 'success');
    setTimeout(() => checkAuth(), 800);
  } catch (err) {
    showAuthMessage(err.message, 'error');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('POST', '/auth/logout');
  authScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
  adminScreen.classList.add('hidden');
});

// Admin login
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    showAuthMessage('Logging in as admin...');
    await api('POST', '/admin/login', {
      username: fd.get('adminUsername'),
      password: fd.get('adminPassword')
    });
    showAuthMessage('Admin login successful.', 'success');
    showAdminDashboard();
  } catch (err) {
    showAuthMessage(err.message, 'error');
  }
});

// Admin logout
document.getElementById('admin-logout-btn').addEventListener('click', async () => {
  try {
    await api('POST', '/admin/logout');
  } catch (_) {}
  adminScreen.classList.add('hidden');
  dashboard.classList.add('hidden');
  authScreen.classList.remove('hidden');
});

// Page Navigation
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');
    loadPage(btn.dataset.page);
  });
});

function loadPage(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('hidden', p.id !== 'page-' + page);
  });
  if (page === 'preferences') loadPreferences();
  if (page === 'profile') loadProfile();
  if (page === 'sem1') loadSem1();
  if (page === 'rankings') loadRankings();
}

// Preferences
async function loadPreferences() {
  const list = document.getElementById('preference-list');
  list.innerHTML = '';
  try {
    const { disciplines } = await api('GET', '/user/disciplines');
    const { preferences } = await api('GET', '/preferences');

    for (let pos = 1; pos <= 8; pos++) {
      const row = document.createElement('div');
      row.className = 'pref-row';
      const select = document.createElement('select');
      select.name = 'pref' + pos;
      select.required = true;
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = `Position ${pos} - Select discipline`;
      select.appendChild(opt0);
      disciplines.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        if (preferences && preferences.prefs[pos - 1] === d.id) opt.selected = true;
        select.appendChild(opt);
      });
      row.innerHTML = `<label>Position ${pos}</label>`;
      row.appendChild(select);
      list.appendChild(row);
    }

    // Set up dynamic option filtering so once a discipline is selected
    // it is not available in the other dropdowns.
    const selects = Array.from(document.querySelectorAll('#preference-list select'));

    function refreshPreferenceOptions() {
      const selectedBySelect = new Map();
      selects.forEach(sel => {
        const v = sel.value;
        if (v) selectedBySelect.set(sel, v);
      });

      selects.forEach(sel => {
        const currentValue = sel.value;
        const otherSelected = new Set(
          Array.from(selectedBySelect.entries())
            .filter(([s]) => s !== sel)
            .map(([, v]) => v)
        );

        Array.from(sel.options).forEach(opt => {
          if (!opt.value) return;
          if (opt.value === currentValue) {
            opt.disabled = false;
          } else {
            opt.disabled = otherSelected.has(opt.value);
          }
        });
      });
    }

    selects.forEach(sel => {
      sel.addEventListener('change', refreshPreferenceOptions);
    });

    // Initial refresh to account for any pre-filled preferences
    refreshPreferenceOptions();
  } catch (err) {
    list.innerHTML = '<p class="error">Failed to load disciplines</p>';
  }
}

document.getElementById('preference-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('pref-message');
  const fd = new FormData(e.target);
  const prefs = [];
  for (let i = 1; i <= 8; i++) prefs.push(parseInt(fd.get('pref' + i), 10));
  if (new Set(prefs).size !== 8) {
    msg.textContent = 'All 8 disciplines must be ranked uniquely (no duplicates)';
    msg.className = 'error';
    return;
  }
  try {
    await api('POST', '/preferences', {
      pref1: prefs[0], pref2: prefs[1], pref3: prefs[2], pref4: prefs[3],
      pref5: prefs[4], pref6: prefs[5], pref7: prefs[6], pref8: prefs[7]
    });
    msg.textContent = 'Preferences saved successfully.';
    msg.className = 'success';
    loadRankings(); // refresh ranking if on that page
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'error';
  }
});

// Profile
async function loadProfile() {
  const content = document.getElementById('profile-content');
  try {
    const p = await api('GET', '/user/profile');
    content.innerHTML = `
      <div class="profile-grid">
        <div class="profile-item"><strong>First Name</strong><span>${escapeHtml(p.firstName)}</span></div>
        <div class="profile-item"><strong>Last Name</strong><span>${escapeHtml(p.lastName)}</span></div>
        <div class="profile-item"><strong>Batch Year</strong><span>${escapeHtml(p.batchYear)}</span></div>
        <div class="profile-item"><strong>Email</strong><span>${escapeHtml(p.email)}</span></div>
        <div class="profile-item"><strong>Username</strong><span>${escapeHtml(p.username)}</span></div>
        <div class="profile-item"><strong>Registered</strong><span>${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</span></div>
        <div class="profile-item"><strong>Sem 1 Marks</strong><span>${p.sem1Marks != null ? p.sem1Marks : 'Not entered'}</span></div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<p class="error">Failed to load profile</p>';
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Sem1
async function loadSem1() {
  try {
    const p = await api('GET', '/user/profile');
    document.querySelector('#sem1-form input[name="marks"]').value = p.sem1Marks ?? '';
  } catch (_) {}
}

document.getElementById('sem1-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('sem1-message');
  const marks = document.querySelector('#sem1-form input[name="marks"]').value;
  try {
    await api('PUT', '/user/sem1', { marks });
    msg.textContent = 'Marks saved successfully.';
    msg.className = 'success';
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'error';
  }
});

// Rankings
async function loadRankings() {
  const statsEl = document.getElementById('ranking-stats');
  const tableEl = document.getElementById('ranking-table');
  try {
    const data = await api('GET', '/rankings/cutoff');
    statsEl.textContent = `Total responses: ${data.totalResponses} | Updated in real time`;

    tableEl.innerHTML = `
      <div class="ranking-table">
        <table>
          <thead><tr><th>Rank</th><th>Discipline</th><th>Cut-off Score</th></tr></thead>
          <tbody>
            ${data.ranking.map((r, i) => `
              <tr>
                <td class="rank-${Math.min(i + 1, 3)}">${i + 1}</td>
                <td>${escapeHtml(r.name)}</td>
                <td>${r.score.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Chart
    const ctx = document.getElementById('cutoff-chart')?.getContext('2d');
    if (ctx) {
      if (cutoffChart) cutoffChart.destroy();
      cutoffChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.ranking.map(r => r.name),
          datasets: [{
            label: 'Cut-off Score',
            data: data.ranking.map(r => r.score),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#a1a1aa' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#a1a1aa', maxRotation: 45 }
            }
          }
        }
      });
    }
  } catch (err) {
    statsEl.textContent = '';
    tableEl.innerHTML = '<p class="error">Failed to load rankings</p>';
  }
}

// Admin users view
async function loadAdminUsers() {
  const msgEl = document.getElementById('admin-users-message');
  const tableEl = document.getElementById('admin-users-table');
  msgEl.textContent = '';
  msgEl.className = '';
  tableEl.innerHTML = '';

  try {
    const data = await api('GET', '/admin/users');
    if (!data.users || data.users.length === 0) {
      msgEl.textContent = 'No users registered yet.';
      msgEl.className = 'success';
      return;
    }

    const rowsHtml = data.users.map((u, idx) => {
      const fullName = `${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}`;
      const prefs = u.preferences
        ? `<ol class="prefs-list">${u.preferences.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ol>`
        : '<span class="hint">No preferences yet</span>';
      const marks = u.sem1Marks != null ? u.sem1Marks : 'Not entered';
      const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${fullName}</td>
          <td>${escapeHtml(u.batchYear)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><code>${escapeHtml(u.username)}</code></td>
          <td>${marks}</td>
          <td>${prefs}</td>
        </tr>
      `;
    }).join('');

    tableEl.innerHTML = `
      <div class="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Batch</th>
              <th>Email</th>
              <th>Username</th>
              <th>Sem 1 Marks</th>
              <th>Latest Preferences</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    msgEl.textContent = err.message || 'Failed to load users';
    msgEl.className = 'error';
  }
}

// Auto-refresh rankings periodically when on rankings page
setInterval(() => {
  if (dashboard.classList.contains('hidden')) return;
  const rankingsPage = document.getElementById('page-rankings');
  if (rankingsPage && !rankingsPage.classList.contains('hidden')) {
    loadRankings();
  }
}, 15000);

// Init
checkAuth();
