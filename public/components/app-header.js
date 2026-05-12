class AppHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="header">
  <div class="header-title">🧠 ЦИФРОВОЙ ТРЕНИНГ ГОРИЗОНТАЛЬНОЙ АБНОТИВНОСТИ</div>
  <nav>
    <button id="nb-landing" onclick="go('landing')" class="active">Главная</button>
    <button id="nb-training" onclick="go('training')">Тренинг</button>
    <button id="nb-library" onclick="go('library')">Библиотека</button>
    <button id="nb-profile" onclick="go('profile')">Кабинет</button>
    <button id="nb-admin" onclick="go('admin')">Админ</button>
    <button id="nb-login" onclick="go('login')">Войти</button>
    <button id="nb-logout" onclick="logout()">Выйти</button>
  </nav>
</div>`;
    document.addEventListener('app:ready', () => this._bind());
  }

  _bind() {
    this._updateNav(state);
    this._updateActiveBtn(state.page);
    subscribe((s, prev) => {
      if (s.currentUser !== prev.currentUser) this._updateNav(s);
      if (s.page !== prev.page) this._updateActiveBtn(s.page);
    });
  }

  _updateNav(s) {
    const isAdmin = s.currentUser?.role === 'admin';
    this.querySelector('#nb-profile').style.display = s.currentUser ? '' : 'none';
    this.querySelector('#nb-admin').style.display = isAdmin ? '' : 'none';
    this.querySelector('#nb-login').style.display = s.currentUser ? 'none' : '';
    this.querySelector('#nb-logout').style.display = s.currentUser ? '' : 'none';
  }

  _updateActiveBtn(page) {
    this.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    const btn = this.querySelector('#nb-' + page);
    if (btn) btn.classList.add('active');
  }
}
customElements.define('app-header', AppHeader);
