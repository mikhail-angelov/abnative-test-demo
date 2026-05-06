// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  return { status: res.status, data };
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('abnative_token'),
  currentUser: JSON.parse(localStorage.getItem('abnative_user') || 'null'),
  page: 'landing',
  quizState: null,
  selectedOption: -1,
  editingId: null,
  formQuestions: [], // mutated directly for fine-grained form edits
};

const _subs = new Set();
function subscribe(fn) { _subs.add(fn); }
function setState(patch) {
  const prev = { ...state };
  Object.assign(state, patch);
  for (const fn of _subs) fn(state, prev);
}

// ── Page switching ────────────────────────────────────────────────────────────
subscribe((s, prev) => {
  if (s.page === prev.page) return;
  document.querySelectorAll('.pg').forEach(el => el.classList.remove('act'));
  const el = document.getElementById('page-' + s.page);
  if (el) el.classList.add('act');
});

function go(page) { setState({ page }); }

// ── Auth ──────────────────────────────────────────────────────────────────────
function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('reg-pass').value;
  const msg = document.getElementById('reg-msg');
  msg.className = 'msg'; msg.style.display = 'none';
  if (!name || !email || !pass) { msg.textContent = 'Заполните все поля'; msg.style.display = 'block'; return; }
  if (pass.length < 6) { msg.textContent = 'Пароль минимум 6 символов'; msg.style.display = 'block'; return; }
  const res = await api('POST', '/api/auth/register', { name, email, password: pass });
  if (res.status === 201) {
    msg.className = 'msg ok'; msg.textContent = 'Регистрация успешна! Войдите.'; msg.style.display = 'block';
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-pass').value = '';
    setTimeout(() => { showLogin(); msg.style.display = 'none'; }, 1500);
  } else {
    msg.textContent = res.data.error || 'Ошибка регистрации'; msg.style.display = 'block';
  }
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  const msg = document.getElementById('login-error'); msg.style.display = 'none';
  const res = await api('POST', '/api/auth/login', { email, password: pass });
  if (res.status === 200) {
    const { token, user } = res.data;
    localStorage.setItem('abnative_token', token);
    localStorage.setItem('abnative_user', JSON.stringify(user));
    setState({ token, currentUser: user, page: user.role === 'admin' ? 'admin' : 'profile' });
  } else {
    msg.textContent = res.data.error || 'Неверный email или пароль'; msg.style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('abnative_token');
  localStorage.removeItem('abnative_user');
  setState({ token: null, currentUser: null, page: 'landing', quizState: null });
}

// ── Profile ───────────────────────────────────────────────────────────────────
async function loadProfile() {
  if (!state.currentUser) return;
  const userRes = await api('GET', '/api/users/me');
  if (userRes.status !== 200) return;
  const u = userRes.data;
  document.getElementById('p-name').textContent = u.name;
  document.getElementById('p-email').textContent = u.email;
  const sesRes = await api('GET', '/api/sessions');
  const my = sesRes.data.sessions || [];
  let correct = 0, all = 0;
  for (const s of my) { correct += s.correct; all += s.total; }
  document.getElementById('s-total').textContent = my.length;
  document.getElementById('s-correct').textContent = correct;
  document.getElementById('s-avg').textContent = all > 0 ? Math.round(correct / all * 100) + '%' : '-';
  const el = document.getElementById('p-history');
  if (my.length === 0) { el.innerHTML = '<p style="color:#8a7a6a">Вы ещё не проходили тренинг.</p>'; return; }
  my.sort((a, b) => a.id > b.id ? -1 : 1);
  let html = '<table class="ht"><tr><th>Дата</th><th>Задание</th><th>Результат</th></tr>';
  for (let i = 0; i < Math.min(50, my.length); i++) {
    const s = my[i];
    html += '<tr><td>' + esc(s.date) + '</td><td>' + esc(s.taskName) + '</td><td class="' + (s.pct >= 60 ? 'pas' : 'fal') + '">' + s.correct + '/' + s.total + ' (' + s.pct + '%)</td></tr>';
  }
  el.innerHTML = html + '</table>';
}

// ── Training ──────────────────────────────────────────────────────────────────
async function renderTaskList() {
  const el = document.getElementById('task-list');
  if (!el) return;
  const res = await api('GET', '/api/tasks');
  const tasks = res.data.tasks || [];
  if (tasks.length === 0) { el.innerHTML = '<div class="nt">Пока нет заданий.</div>'; return; }
  let html = '';
  for (const t of tasks) {
    html += '<div class="tc" style="cursor:pointer" onclick="startQuiz(\'' + esc(t.id) + '\')">'
      + '<div class="ti"><h4>' + esc(t.name) + '</h4><span>' + esc(t.description || '') + ' - ' + (t.numQuestions || t.totalQuestions) + ' вопросов</span></div>'
      + '<button class="btn btn-p">Начать</button></div>';
  }
  el.innerHTML = html;
}

async function startQuiz(taskId) {
  if (!state.currentUser) { alert('Войдите в систему'); go('login'); return; }
  const res = await api('GET', '/api/tasks/' + taskId);
  if (res.status !== 200) return;
  const task = res.data.task;
  const n = Math.min(task.numQuestions || task.questions.length, task.questions.length);
  const questions = task.questions.slice().sort(() => Math.random() - 0.5).slice(0, n);
  setState({
    quizState: { taskId: task.id, taskName: task.name, questions, index: 0, answers: [], finished: false },
    selectedOption: -1,
  });
}

function renderQuestion() {
  const qs = state.quizState;
  if (!qs || qs.finished) return;
  const { index: i, questions } = qs;
  const q = questions[i];
  document.getElementById('q-progress').textContent = 'Вопрос ' + (i + 1) + ' из ' + questions.length;
  let html = '<div class="qc"><div class="qt">' + esc(q.text) + '</div>';
  for (let j = 0; j < q.options.length; j++) {
    html += '<label class="op" onclick="selectOpt(' + j + ')"><input type="radio" name="qa"> ' + esc(q.options[j].text) + '</label>';
  }
  html += '<div class="fb" id="fb"><span id="fb-label"></span><div id="fb-text" style="margin-top:.5rem;line-height:1.6"></div></div>';
  html += '<div class="qct"><button class="btn btn-p" id="btn-confirm" onclick="confirmAns()" disabled>Ответить</button>';
  html += '<button class="btn btn-p" id="btn-next" style="display:none" onclick="nextQ()">' + (i < questions.length - 1 ? 'Следующий вопрос' : 'Завершить') + '</button></div></div>';
  document.getElementById('q-area').innerHTML = html;
}

function selectOpt(idx) {
  setState({ selectedOption: idx });
  const opts = document.querySelectorAll('.op');
  for (let i = 0; i < opts.length; i++) { opts[i].classList.toggle('sel', i === idx); }
  document.getElementById('btn-confirm').disabled = false;
}

function confirmAns() {
  if (state.selectedOption < 0) return;
  const qs = state.quizState;
  const q = qs.questions[qs.index];
  const cr = q.options[state.selectedOption].c;
  const fb = document.getElementById('fb'); fb.classList.add('sh');
  document.getElementById('fb-label').innerHTML = cr ? '<span class="gr">Верно!</span>' : '<span class="rd">Неверно</span>';
  document.getElementById('fb-text').textContent = q.expl || '';
  const opts = document.querySelectorAll('.op');
  for (let j = 0; j < opts.length; j++) {
    opts[j].style.pointerEvents = 'none';
    if (q.options[j].c) opts[j].classList.add('ok');
    else if (j === state.selectedOption) opts[j].classList.add('bad');
  }
  setState({ quizState: { ...qs, answers: [...qs.answers, cr] } });
  document.getElementById('btn-confirm').style.display = 'none';
  document.getElementById('btn-next').style.display = '';
}

function nextQ() {
  const qs = state.quizState;
  if (qs.index + 1 >= qs.questions.length) { showResults(); return; }
  setState({ quizState: { ...qs, index: qs.index + 1 }, selectedOption: -1 });
  renderQuestion();
}

async function showResults() {
  const qs = state.quizState;
  const correct = qs.answers.filter(Boolean).length;
  const total = qs.answers.length;
  setState({ quizState: { ...qs, finished: true } });
  document.getElementById('q-area').innerHTML = '';
  document.getElementById('q-results').style.display = 'block';
  document.getElementById('q-results').innerHTML = '<div class="rc"><h2>Тренинг завершён!</h2><div class="sc">' + correct + ' / ' + total + '</div><div style="margin-bottom:1.5rem">правильных ответов (' + Math.round(correct / total * 100) + '%)</div><button class="btn btn-p" onclick="exitQuiz()">К списку</button></div>';
  if (state.currentUser) {
    const ds = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await api('POST', '/api/sessions', { taskId: qs.taskId, taskName: qs.taskName, correct, total, pct: Math.round(correct / total * 100), date: ds });
  }
}

function exitQuiz() {
  setState({ quizState: null, selectedOption: -1 });
}

// ── Admin ─────────────────────────────────────────────────────────────────────
async function renderAdminList() {
  const el = document.getElementById('admin-list');
  if (!el) return;
  const res = await api('GET', '/api/tasks');
  const tasks = res.data.tasks || [];
  if (tasks.length === 0) { el.innerHTML = '<div class="nt">Нет заданий.</div>'; return; }
  let html = '';
  for (const t of tasks) {
    html += '<div class="tc' + (state.editingId === t.id ? ' selected' : '') + '" data-id="' + esc(t.id) + '" onclick="editTask(\'' + esc(t.id) + '\')" style="cursor:pointer">'
      + '<div class="ti"><h4>' + esc(t.name) + '</h4><span>' + t.totalQuestions + ' вопросов, показ ' + t.numQuestions + '</span></div>'
      + '<button class="btn btn-d" onclick="event.stopPropagation();deleteTask(\'' + esc(t.id) + '\')">✕</button></div>';
  }
  el.innerHTML = html;
}

// Update selection CSS only — no re-fetch
function _syncAdminSelection() {
  const id = state.editingId;
  document.querySelectorAll('#admin-list .tc[data-id]').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
}

function _showAdminForm(title) {
  document.getElementById('admin-edit-ph').style.display = 'none';
  document.getElementById('admin-form').style.display = 'block';
  document.getElementById('form-title').textContent = title;
}

function newTask() {
  state.formQuestions = [{ text: '', options: [{ text: '', c: true }, { text: '', c: false }, { text: '', c: false }], expl: '' }];
  _showAdminForm('Новое задание');
  document.getElementById('task-name').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-num').value = '5';
  renderQEditors();
  setState({ editingId: null });
  _syncAdminSelection(); // editingId may not have changed, so force sync
}

async function editTask(id) {
  const res = await api('GET', '/api/tasks/' + id);
  if (res.status !== 200) return;
  const task = res.data.task;
  state.formQuestions = task.questions.map(q => ({
    text: q.text,
    options: q.options.map(o => ({ text: o.text, c: o.c })),
    expl: q.expl || '',
  }));
  if (state.formQuestions.length === 0) {
    state.formQuestions.push({ text: '', options: [{ text: '', c: true }, { text: '', c: false }, { text: '', c: false }], expl: '' });
  }
  _showAdminForm('Редактирование задания');
  document.getElementById('task-name').value = task.name;
  document.getElementById('task-desc').value = task.description || '';
  document.getElementById('task-num').value = task.numQuestions || task.questions.length;
  renderQEditors();
  setState({ editingId: id }); // subscriber updates selection CSS
}

function cancelEdit() {
  state.formQuestions = [];
  document.getElementById('admin-edit-ph').style.display = '';
  document.getElementById('admin-form').style.display = 'none';
  setState({ editingId: null });
  _syncAdminSelection();
}

async function deleteTask(id) {
  if (!confirm('Удалить задание?')) return;
  await api('DELETE', '/api/tasks/' + id);
  if (state.editingId === id) cancelEdit();
  await renderAdminList();
  renderTaskList();
}

// ── Admin form ────────────────────────────────────────────────────────────────
function addQ() {
  state.formQuestions.push({ text: '', options: [{ text: '', c: true }, { text: '', c: false }, { text: '', c: false }], expl: '' });
  renderQEditors();
}

function renderQEditors() {
  const c = document.getElementById('q-container');
  c.innerHTML = '';
  for (let i = 0; i < state.formQuestions.length; i++) { renderQEditor(i); }
}

function renderQEditor(idx) {
  const q = state.formQuestions[idx];
  if (!q) return;
  const c = document.getElementById('q-container');
  const d = document.createElement('div'); d.className = 'qe';
  let optionsHtml = '';
  for (let j = 0; j < q.options.length; j++) {
    const o = q.options[j];
    optionsHtml += '<div class="or"><input type="radio" name="qr' + idx + '" ' + (o.c ? 'checked' : '') + ' onchange="setCorrect(' + idx + ',' + j + ')">'
      + '<input type="text" value="' + esc(o.text) + '" placeholder="Вариант ' + (j + 1) + '" onchange="updateQ(' + idx + ',\'opt\',' + j + ',this.value)">';
    if (q.options.length > 2) {
      optionsHtml += '<button style="background:none;border:none;cursor:pointer;color:#b05050;font-size:1rem" onclick="removeOpt(' + idx + ',' + j + ')">X</button>';
    }
    optionsHtml += '</div>';
  }
  d.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;font-weight:600">'
    + '<span>Вопрос ' + (idx + 1) + '</span>'
    + '<button style="background:none;border:none;cursor:pointer;color:#b05050;font-size:1rem" onclick="this.parentElement.parentElement.remove()">X</button></div>'
    + '<div class="fg"><textarea onchange="updateQ(' + idx + ',\'text\',null,this.value)" placeholder="Текст вопроса">' + esc(q.text) + '</textarea></div>'
    + '<div class="fg"><label>Варианты (радио = правильный)</label>' + optionsHtml
    + '<button class="btn btn-s" style="margin-top:.3rem;font-size:.85rem;padding:.3rem .6rem" onclick="addOpt(' + idx + ')">+ вариант</button></div>'
    + '<div class="fg"><label>Пояснение</label><textarea onchange="updateQ(' + idx + ',\'expl\',null,this.value)" placeholder="Почему это правильно?">' + esc(q.expl || '') + '</textarea></div>';
  if (c.children[idx]) { c.replaceChild(d, c.children[idx]); } else { c.appendChild(d); }
}

function updateQ(idx, field, optIdx, val) {
  if (!state.formQuestions[idx]) return;
  if (field === 'text') { state.formQuestions[idx].text = val; }
  else if (field === 'expl') { state.formQuestions[idx].expl = val; }
  else if (field === 'opt' && typeof optIdx === 'number') {
    if (state.formQuestions[idx].options[optIdx]) state.formQuestions[idx].options[optIdx].text = val;
  }
}

function setCorrect(idx, optIdx) {
  if (!state.formQuestions[idx]) return;
  for (let j = 0; j < state.formQuestions[idx].options.length; j++) {
    state.formQuestions[idx].options[j].c = (j === optIdx);
  }
}

function addOpt(idx) {
  if (!state.formQuestions[idx]) return;
  state.formQuestions[idx].options.push({ text: '', c: false });
  renderQEditor(idx);
}

function removeOpt(idx, optIdx) {
  if (!state.formQuestions[idx] || state.formQuestions[idx].options.length <= 2) return;
  state.formQuestions[idx].options.splice(optIdx, 1);
  renderQEditor(idx);
}

async function saveTask() {
  const name = document.getElementById('task-name').value.trim();
  if (!name) { alert('Введите название'); return; }
  const validQs = state.formQuestions.filter(q => q.text.trim());
  if (validQs.length === 0) { alert('Добавьте хотя бы один вопрос с текстом'); return; }
  const nq = parseInt(document.getElementById('task-num').value) || validQs.length;
  const questions = validQs.map(q => ({
    text: q.text,
    options: q.options.map(o => ({ text: o.text, c: o.c })),
    expl: q.expl,
  }));
  const task = {
    id: state.editingId,
    name,
    description: document.getElementById('task-desc').value.trim(),
    numQuestions: Math.min(nq, questions.length),
    questions,
  };
  const res = await api('POST', '/api/tasks', task);
  if (res.status === 200) {
    cancelEdit();
    await renderAdminList();
    renderTaskList();
    alert('Сохранено!');
  } else {
    alert('Ошибка сохранения: ' + (res.data.error || 'неизвестная'));
  }
}

// ── Ready ─────────────────────────────────────────────────────────────────────
document.dispatchEvent(new Event('app:ready'));
