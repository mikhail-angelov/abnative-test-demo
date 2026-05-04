var API = '';
var token = localStorage.getItem('abnative_token');
var currentUser = JSON.parse(localStorage.getItem('abnative_user') || 'null');
var quizState = null;
var selectedOption = -1;
var editingId = null;
var formQuestions = [];

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function api(method, path, body) {
  var opts = { method: method, headers: { 'Content-Type': 'application/json' }};
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body !== undefined) opts.body = JSON.stringify(body);
  var res = await fetch(API + path, opts);
  var data = await res.json();
  return { status: res.status, data: data };
}

function go(page) {
  var pages = ['landing', 'training', 'login', 'profile', 'admin'];
  for (var i = 0; i < pages.length; i++) {
    var el = document.getElementById('page-' + pages[i]);
    if (el) el.classList.remove('act');
  }
  var target = document.getElementById('page-' + page);
  if (target) target.classList.add('act');
  var navBtns = ['landing', 'training', 'profile', 'admin', 'login', 'logout'];
  for (var i = 0; i < navBtns.length; i++) {
    var btn = document.getElementById('nb-' + navBtns[i]);
    if (btn) btn.classList.remove('active');
  }
  var activeBtn = document.getElementById('nb-' + page);
  if (activeBtn) activeBtn.classList.add('active');
  if (page === 'profile') loadProfile();
  if (page === 'admin' && currentUser && currentUser.role === 'admin') renderAdminList();
  if (page === 'training') renderTaskList();
}

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

async function doRegister() {
  var name = document.getElementById('reg-name').value.trim();
  var email = document.getElementById('reg-email').value.trim().toLowerCase();
  var pass = document.getElementById('reg-pass').value;
  var msg = document.getElementById('reg-msg');
  msg.className = 'msg'; msg.style.display = 'none';
  if (!name || !email || !pass) { msg.textContent = 'Заполните все поля'; msg.style.display = 'block'; return; }
  if (pass.length < 6) { msg.textContent = 'Пароль минимум 6 символов'; msg.style.display = 'block'; return; }
  var res = await api('POST', '/api/auth/register', { name: name, email: email, password: pass });
  if (res.status === 201) {
    msg.className = 'msg ok'; msg.textContent = 'Регистрация успешна! Войдите.'; msg.style.display = 'block';
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-pass').value = '';
    setTimeout(function() { showLogin(); msg.style.display = 'none'; }, 1500);
  } else {
    msg.textContent = res.data.error || 'Ошибка регистрации'; msg.style.display = 'block';
  }
}

async function doLogin() {
  var email = document.getElementById('login-email').value.trim().toLowerCase();
  var pass = document.getElementById('login-pass').value;
  var msg = document.getElementById('login-error'); msg.style.display = 'none';
  var res = await api('POST', '/api/auth/login', { email: email, password: pass });
  if (res.status === 200) {
    token = res.data.token;
    currentUser = res.data.user;
    localStorage.setItem('abnative_token', token);
    localStorage.setItem('abnative_user', JSON.stringify(currentUser));
    updateNav();
    if (currentUser.role === 'admin') { go('admin'); } else { go('profile'); }
  } else {
    msg.textContent = res.data.error || 'Неверный email или пароль'; msg.style.display = 'block';
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('abnative_token');
  localStorage.removeItem('abnative_user');
  updateNav();
  go('landing');
}

function updateNav() {
  document.getElementById('nb-profile').style.display = currentUser ? '' : 'none';
  document.getElementById('nb-admin').style.display = (currentUser && currentUser.role === 'admin') ? '' : 'none';
  document.getElementById('nb-login').style.display = currentUser ? 'none' : '';
  document.getElementById('nb-logout').style.display = currentUser ? '' : 'none';
  if (currentUser && currentUser.role === 'admin') renderAdminList();
}

async function loadProfile() {
  if (!currentUser) return;
  var userRes = await api('GET', '/api/users/me');
  if (userRes.status !== 200) return;
  var u = userRes.data;
  document.getElementById('p-name').textContent = u.name;
  document.getElementById('p-email').textContent = u.email;
  var sesRes = await api('GET', '/api/sessions');
  var my = sesRes.data.sessions || [];
  var total = my.length, correct = 0, all = 0;
  for (var i = 0; i < my.length; i++) { correct += my[i].correct; all += my[i].total; }
  document.getElementById('s-total').textContent = total;
  document.getElementById('s-correct').textContent = correct;
  document.getElementById('s-avg').textContent = all > 0 ? Math.round(correct / all * 100) + '%' : '-';
  var el = document.getElementById('p-history');
  if (my.length === 0) { el.innerHTML = '<p style="color:#8a7a6a">Вы ещё не проходили тренинг.</p>'; return; }
  my.sort(function(a, b) { return a.id > b.id ? -1 : 1; });
  var html = '<table class="ht"><tr><th>Дата</th><th>Задание</th><th>Результат</th></tr>';
  for (var i = 0; i < Math.min(50, my.length); i++) {
    var s = my[i];
    html += '<tr><td>' + s.date + '</td><td>' + s.taskName + '</td><td class="' + (s.pct >= 60 ? 'pas' : 'fal') + '">' + s.correct + '/' + s.total + ' (' + s.pct + '%)</td></tr>';
  }
  el.innerHTML = html + '</table>';
}

async function renderTaskList() {
  var el = document.getElementById('task-list');
  var res = await api('GET', '/api/tasks');
  var tasks = res.data.tasks || [];
  if (tasks.length === 0) { el.innerHTML = '<div class="nt">Пока нет заданий.</div>'; return; }
  var html = '';
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    html += '<div class="tc" style="cursor:pointer" onclick="startQuiz(\'' + t.id + '\')">' +
      '<div class="ti"><h4>' + esc(t.name) + '</h4><span>' + (t.description || '') + ' - ' + (t.numQuestions || t.totalQuestions) + ' вопросов</span></div>' +
      '<button class="btn btn-p">Начать</button></div>';
  }
  el.innerHTML = html;
}

async function startQuiz(taskId) {
  if (!currentUser) { alert('Войдите в систему'); go('login'); return; }
  var res = await api('GET', '/api/tasks/' + taskId);
  if (res.status !== 200) return;
  var task = res.data.task;
  var n = Math.min(task.numQuestions || task.questions.length, task.questions.length);
  var shuffled = task.questions.slice().sort(function() { return Math.random() - 0.5; }).slice(0, n);
  quizState = { taskId: task.id, taskName: task.name, questions: shuffled, index: 0, answers: [], finished: false };
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('quiz-screen').style.display = 'block';
  document.getElementById('q-results').style.display = 'none';
  document.getElementById('q-task-name').textContent = task.name;
  selectedOption = -1;
  renderQuestion();
}

function renderQuestion() {
  if (!quizState || quizState.finished) return;
  var i = quizState.index;
  var q = quizState.questions[i];
  var total = quizState.questions.length;
  document.getElementById('q-progress').textContent = 'Вопрос ' + (i + 1) + ' из ' + total;
  var html = '<div class="qc"><div class="qt">' + esc(q.text) + '</div>';
  for (var j = 0; j < q.options.length; j++) {
    html += '<label class="op" onclick="selectOpt(' + j + ')"><input type="radio" name="qa"> ' + esc(q.options[j].text) + '</label>';
  }
  html += '<div class="fb" id="fb"><span id="fb-label"></span><div id="fb-text" style="margin-top:.5rem;line-height:1.6"></div></div>';
  html += '<div class="qct"><button class="btn btn-p" id="btn-confirm" onclick="confirmAns()" disabled>Ответить</button>';
  html += '<button class="btn btn-p" id="btn-next" style="display:none" onclick="nextQ()">' + (i < total - 1 ? 'Следующий вопрос' : 'Завершить') + '</button></div></div>';
  document.getElementById('q-area').innerHTML = html;
  selectedOption = -1;
}

function selectOpt(idx) {
  selectedOption = idx;
  var opts = document.querySelectorAll('.op');
  for (var i = 0; i < opts.length; i++) { opts[i].classList.toggle('sel', i === idx); }
  document.getElementById('btn-confirm').disabled = false;
}

function confirmAns() {
  if (selectedOption < 0) return;
  var i = quizState.index;
  var q = quizState.questions[i];
  var cr = q.options[selectedOption].c;
  var fb = document.getElementById('fb'); fb.classList.add('sh');
  document.getElementById('fb-label').innerHTML = cr ? '<span class="gr">Верно!</span>' : '<span class="rd">Неверно</span>';
  document.getElementById('fb-text').textContent = q.expl || '';
  var opts = document.querySelectorAll('.op');
  for (var j = 0; j < opts.length; j++) {
    opts[j].style.pointerEvents = 'none';
    if (q.options[j].c) opts[j].classList.add('ok');
    else if (j === selectedOption) opts[j].classList.add('bad');
  }
  quizState.answers.push(cr);
  document.getElementById('btn-confirm').style.display = 'none';
  document.getElementById('btn-next').style.display = '';
}

function nextQ() {
  quizState.index++;
  if (quizState.index >= quizState.questions.length) { showResults(); return; }
  selectedOption = -1;
  renderQuestion();
}

async function showResults() {
  quizState.finished = true;
  var correct = 0;
  for (var i = 0; i < quizState.answers.length; i++) { if (quizState.answers[i]) correct++; }
  var total = quizState.answers.length;
  document.getElementById('q-area').innerHTML = '';
  document.getElementById('q-results').style.display = 'block';
  document.getElementById('q-results').innerHTML = '<div class="rc"><h2>Тренинг завершён!</h2><div class="sc">' + correct + ' / ' + total + '</div><div style="margin-bottom:1.5rem">правильных ответов (' + Math.round(correct / total * 100) + '%)</div><button class="btn btn-p" onclick="exitQuiz()">К списку</button></div>';
  if (currentUser) {
    var d = new Date();
    var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    await api('POST', '/api/sessions', { taskId: quizState.taskId, taskName: quizState.taskName, correct: correct, total: total, pct: Math.round(correct / total * 100), date: ds });
  }
}

function exitQuiz() {
  quizState = null; selectedOption = -1;
  document.getElementById('quiz-screen').style.display = 'none';
  document.getElementById('welcome-screen').style.display = 'block';
  renderTaskList();
}

async function renderAdminList() {
  var el = document.getElementById('admin-list');
  var res = await api('GET', '/api/tasks');
  var tasks = res.data.tasks || [];
  if (tasks.length === 0) { el.innerHTML = '<div class="nt">Нет заданий.</div>'; return; }
  var html = '';
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    html += '<div class="tc"><div class="ti"><h4>' + esc(t.name) + '</h4><span>' + t.totalQuestions + ' вопросов, показ ' + t.numQuestions + '</span></div>' +
      '<div class="ta"><button class="btn btn-p" onclick="editTask(\'' + t.id + '\')">E</button><button class="btn btn-d" onclick="deleteTask(\'' + t.id + '\')">X</button></div></div>';
  }
  el.innerHTML = html;
}

async function deleteTask(id) {
  if (!confirm('Удалить задание?')) return;
  await api('DELETE', '/api/tasks/' + id);
  renderAdminList();
  renderTaskList();
}

async function editTask(id) {
  var res = await api('GET', '/api/tasks/' + id);
  if (res.status !== 200) return;
  var task = res.data.task;
  editingId = id;
  document.getElementById('form-title').textContent = 'Редактирование задания';
  document.getElementById('task-name').value = task.name;
  document.getElementById('task-desc').value = task.description || '';
  document.getElementById('task-num').value = task.numQuestions || task.questions.length;
  formQuestions = [];
  for (var i = 0; i < task.questions.length; i++) {
    var q = task.questions[i];
    var opts = [];
    for (var j = 0; j < q.options.length; j++) { opts.push({ text: q.options[j].text, c: q.options[j].c }); }
    formQuestions.push({ text: q.text, options: opts, expl: q.expl || '' });
  }
  if (formQuestions.length === 0) { formQuestions.push({ text: '', options: [{ text: '', c: true }, { text: '', c: false }, { text: '', c: false }], expl: '' }); }
  renderQEditors();
  document.getElementById('admin-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingId = null; formQuestions = [];
  document.getElementById('form-title').textContent = 'Новое задание';
  document.getElementById('task-name').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-num').value = '5';
  document.getElementById('q-container').innerHTML = '';
}

function addQ() {
  var idx = document.getElementById('q-container').children.length;
  formQuestions.push({ text: '', options: [{ text: '', c: true }, { text: '', c: false }, { text: '', c: false }], expl: '' });
  renderQEditor(idx);
}

function renderQEditors() {
  var c = document.getElementById('q-container');
  c.innerHTML = '';
  for (var i = 0; i < formQuestions.length; i++) { renderQEditor(i); }
}

function renderQEditor(idx) {
  var q = formQuestions[idx];
  if (!q) return;
  var c = document.getElementById('q-container');
  var d = document.createElement('div'); d.className = 'qe';
  var optionsHtml = '';
  for (var j = 0; j < q.options.length; j++) {
    var o = q.options[j];
    optionsHtml += '<div class="or"><input type="radio" name="qr' + idx + '" ' + (o.c ? 'checked' : '') + ' onchange="setCorrect(' + idx + ',' + j + ')">' +
      '<input type="text" value="' + esc(o.text) + '" placeholder="Вариант ' + (j + 1) + '" onchange="updateQ(' + idx + ',\'opt\',' + j + ',this.value)">';
    if (q.options.length > 2) {
      optionsHtml += '<button style="background:none;border:none;cursor:pointer;color:#b05050;font-size:1rem" onclick="removeOpt(' + idx + ',' + j + ')">X</button>';
    }
    optionsHtml += '</div>';
  }
  d.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;font-weight:600">' +
    '<span>Вопрос ' + (idx + 1) + '</span>' +
    '<button style="background:none;border:none;cursor:pointer;color:#b05050;font-size:1rem" onclick="this.parentElement.parentElement.remove()">X</button></div>' +
    '<div class="fg"><textarea onchange="updateQ(' + idx + ',\'text\',null,this.value)" placeholder="Текст вопроса">' + esc(q.text) + '</textarea></div>' +
    '<div class="fg"><label>Варианты (радио = правильный)</label>' + optionsHtml +
    '<button class="btn btn-s" style="margin-top:.3rem;font-size:.85rem;padding:.3rem .6rem" onclick="addOpt(' + idx + ')">+ вариант</button></div>' +
    '<div class="fg"><label>Пояснение</label><textarea onchange="updateQ(' + idx + ',\'expl\',null,this.value)" placeholder="Почему это правильно?">' + esc(q.expl || '') + '</textarea></div>';
  if (c.children[idx]) { c.replaceChild(d, c.children[idx]); } else { c.appendChild(d); }
}

function updateQ(idx, field, optIdx, val) {
  if (!formQuestions[idx]) return;
  if (field === 'text') { formQuestions[idx].text = val; }
  else if (field === 'expl') { formQuestions[idx].expl = val; }
  else if (field === 'opt' && typeof optIdx === 'number') { if (formQuestions[idx].options[optIdx]) formQuestions[idx].options[optIdx].text = val; }
}

function setCorrect(idx, optIdx) {
  if (!formQuestions[idx]) return;
  for (var j = 0; j < formQuestions[idx].options.length; j++) { formQuestions[idx].options[j].c = (j === optIdx); }
}

function addOpt(idx) {
  if (!formQuestions[idx]) return;
  formQuestions[idx].options.push({ text: '', c: false });
  renderQEditor(idx);
}

function removeOpt(idx, optIdx) {
  if (!formQuestions[idx] || formQuestions[idx].options.length <= 2) return;
  formQuestions[idx].options.splice(optIdx, 1);
  renderQEditor(idx);
}

async function saveTask() {
  var name = document.getElementById('task-name').value.trim();
  if (!name) { alert('Введите название'); return; }
  var validQs = [];
  for (var i = 0; i < formQuestions.length; i++) {
    if (formQuestions[i].text.trim()) validQs.push(formQuestions[i]);
  }
  if (validQs.length === 0) { alert('Добавьте хотя бы один вопрос с текстом'); return; }
  var nq = parseInt(document.getElementById('task-num').value) || validQs.length;
  var questions = [];
  for (var i = 0; i < validQs.length; i++) {
    var q = validQs[i];
    var opts = [];
    for (var j = 0; j < q.options.length; j++) { opts.push({ text: q.options[j].text, c: q.options[j].c }); }
    questions.push({ text: q.text, options: opts, expl: q.expl });
  }
  var task = {
    id: editingId || 't' + Date.now(),
    name: name,
    description: document.getElementById('task-desc').value.trim(),
    numQuestions: Math.min(nq, questions.length),
    questions: questions
  };
  var res = await api('POST', '/api/tasks', task);
  if (res.status === 200) {
    cancelEdit();
    renderAdminList();
    renderTaskList();
    alert('Сохранено!');
  } else {
    alert('Ошибка сохранения: ' + (res.data.error || 'неизвестная'));
  }
}

updateNav();
renderTaskList();
