// public/js/admin-login.js

// If already logged in, redirect
(async function() {
  try {
    const r = await fetch('/api/admin/session').then(res => res.json());
    if (r.isAdmin) location.href = '/admin';
  } catch(e) {}
})();

document.getElementById('login-btn').addEventListener('click', login);
document.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('error-msg');
  const btn = document.getElementById('login-btn');

  if (!username || !password) { errEl.textContent = 'Please enter username and password.'; return; }

  btn.textContent = 'Signing in...'; btn.disabled = true; errEl.textContent = '';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      location.href = '/admin';
    } else {
      errEl.textContent = 'Invalid username or password.';
      btn.textContent = 'Sign In'; btn.disabled = false;
    }
  } catch(e) {
    errEl.textContent = 'Connection error. Try again.';
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}
