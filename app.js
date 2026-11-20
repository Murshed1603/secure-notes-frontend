const PROD_API = 'https://YOUR-LIVE-BACKEND-URL.onrender.com/api';
const API =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : PROD_API;

let token = localStorage.getItem('token') || '';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let notePage = 1;
let userPage = 1;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateAuthInputs(email, password, requireName = false, name = '') {
  if (requireName && !name.trim()) {
    return 'Full name is required.';
  }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return 'Invalid email address. Please enter a valid format (e.g. name@example.com).';
  }
  if (!password || password.trim().length < 6) {
    return 'Invalid password. Password must be at least 6 characters long.';
  }
  return null;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

function updateUI() {
  const authSec = document.getElementById('authSection');
  const dash = document.getElementById('dashboard');
  const adminSec = document.getElementById('adminSection');
  const statusBar = document.getElementById('statusBar');
  const logoutBtn = document.getElementById('logoutBtn');

  if (token && currentUser) {
    authSec.classList.add('hidden');
    dash.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    const badgeClass = currentUser.role === 'admin' ? 'badge-admin' : 'badge-user';
    statusBar.innerHTML = `Signed in as <strong>${currentUser.name}</strong> <span class="badge ${badgeClass}">${currentUser.role}</span> <code>${currentUser.id}</code>`;
    document.getElementById('notesHeading').innerText =
      currentUser.role === 'admin' ? 'All Users Notes (Admin View)' : 'My Private Notes';

    loadNotes();
    loadPosts();

    if (currentUser.role === 'admin') {
      adminSec.classList.remove('hidden');
      loadUsers();
    } else {
      adminSec.classList.add('hidden');
    }
  } else {
    authSec.classList.remove('hidden');
    dash.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    statusBar.innerText = 'Not logged in';
  }
}

// --- AUTHENTICATION ---
async function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  const interests = document.getElementById('regInterests').value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const error = validateAuthInputs(email, password, true, name);
  if (error) return alert(error);

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, interests })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Registration failed');

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    updateUI();
  } catch (err) {
    alert('Cannot reach backend server. Make sure backend is running.');
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const error = validateAuthInputs(email, password);
  if (error) return alert(error);

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Invalid email or password');

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    updateUI();
  } catch (err) {
    alert('Cannot reach backend server. Make sure backend is running.');
  }
}

function logout() {
  token = '';
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateUI();
}

// --- NOTES CRUD ---
async function loadNotes() {
  const res = await fetch(`${API}/notes?page=${notePage}&limit=5`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) return alert(data.message);

  document.getElementById('notePageInfo').innerText =
    `Page ${data.pagination.page} of ${data.pagination.totalPages || 1} (${data.pagination.totalItems} total)`;

  document.getElementById('notesList').innerHTML = data.notes.length
    ? data.notes
        .map(
          (n) => `
          <div class="card">
            <div class="card-header">
              <strong>${n.title}</strong>
              <small style="color:#94a3b8;">Owner: ${n.userId?.name || 'Unknown'}</small>
            </div>
            <p>${n.content}</p>
            <div class="actions">
              <button class="btn-secondary btn-sm" onclick="editNote('${n._id}', '${n.title.replace(/'/g, "\\'")}', '${n.content.replace(/'/g, "\\'")}')">Edit</button>
              <button class="btn-danger btn-sm" onclick="deleteNote('${n._id}')">Delete</button>
            </div>
          </div>`
        )
        .join('')
    : '<p style="color:#94a3b8;">No notes yet. Create one on the left!</p>';
}

function changeNotePage(delta) {
  if (notePage + delta < 1) return;
  notePage += delta;
  loadNotes();
}

async function createNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!title || !content) return alert('Both title and content are required.');

  const res = await fetch(`${API}/notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, content })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.message);

  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
  loadNotes();
}

async function editNote(id, oldTitle, oldContent) {
  const title = prompt('Update Note Title:', oldTitle);
  const content = prompt('Update Note Content:', oldContent);
  if (title === null || content === null) return;

  const res = await fetch(`${API}/notes/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ title, content })
  });
  if (res.ok) loadNotes();
}

async function deleteNote(id) {
  const res = await fetch(`${API}/notes/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (res.ok) loadNotes();
}

// --- ADMIN USER MANAGEMENT ---
async function loadUsers() {
  const res = await fetch(`${API}/users?page=${userPage}&limit=5`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) return;

  document.getElementById('userPageInfo').innerText =
    `Page ${data.pagination.page} of ${data.pagination.totalPages || 1}`;

  document.getElementById('usersList').innerHTML = data.users
    .map(
      (u) => `
      <div class="card">
        <div class="card-header">
          <strong>${u.name}</strong>
          <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span>
        </div>
        <p style="margin:6px 0;">${u.email} • Interests: ${(u.interests || []).join(', ') || 'None'}<br/><code>${u._id}</code></p>
        <div class="actions">
          <button class="btn-secondary btn-sm" onclick="useIdForLookup('${u._id}')">Use ID for $lookup</button>
          <button class="btn-secondary btn-sm" onclick="toggleRole('${u._id}', '${u.role}')">Toggle Role</button>
          <button class="btn-danger btn-sm" onclick="deleteUser('${u._id}')">Delete</button>
        </div>
      </div>`
    )
    .join('');
}

function useIdForLookup(id) {
  document.getElementById('lookupUserId').value = id;
  lookupUserPosts();
}

function changeUserPage(delta) {
  if (userPage + delta < 1) return;
  userPage += delta;
  loadUsers();
}

async function adminCreateUser() {
  const name = document.getElementById('newUserName').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPass').value;
  const role = document.getElementById('newUserRole').value;
  const interests = document.getElementById('newUserInterests').value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const error = validateAuthInputs(email, password, true, name);
  if (error) return alert(error);

  const res = await fetch(`${API}/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, email, password, role, interests })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.message);

  document.getElementById('newUserName').value = '';
  document.getElementById('newUserEmail').value = '';
  document.getElementById('newUserPass').value = '';
  document.getElementById('newUserInterests').value = '';
  loadUsers();
}

async function toggleRole(id, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  const res = await fetch(`${API}/users/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ role: newRole })
  });
  if (res.ok) loadUsers();
}

async function deleteUser(id) {
  const res = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (res.ok) loadUsers();
}

// --- PUBLIC POSTS & AGGREGATIONS ---
async function createPost() {
  const title = document.getElementById('postTitle').value.trim();
  const body = document.getElementById('postBody').value.trim();
  if (!title || !body) return alert('Both post title and body are required.');

  const res = await fetch(`${API}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, body })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.message);

  document.getElementById('postTitle').value = '';
  document.getElementById('postBody').value = '';
  loadPosts();
}

async function loadPosts() {
  const res = await fetch(`${API}/posts?page=1&limit=10`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) return;

  document.getElementById('postsList').innerHTML = data.posts
    .map(
      (p) => `
      <div class="card">
        <div class="card-header">
          <strong>${p.title}</strong>
          <small style="color:#94a3b8;">by ${p.authorId?.name || 'Unknown'}</small>
        </div>
        <p>${p.body}</p>
        <code>Author ID: ${p.authorId?._id || ''}</code>
      </div>`
    )
    .join('');
}

async function loadGroupedInterests() {
  const res = await fetch(`${API}/users/by-interests`, { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('interestsResult').innerText = JSON.stringify(data, null, 2);
}

async function lookupUserPosts() {
  const userId = document.getElementById('lookupUserId').value.trim();
  if (!userId) return alert('Paste a User ID first');
  const res = await fetch(`${API}/posts/user/${userId}`, { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('lookupResult').innerText = JSON.stringify(data, null, 2);
}

updateUI();