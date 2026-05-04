class AppHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="header">
  <div class="header-title">🧠 ЦИФРОВОЙ ТРЕНИНГ ГОРИЗОНТАЛЬНОЙ АБНОТИВНОСТИ</div>
  <nav>
    <button id="nb-landing" onclick="go('landing')" class="active">Главная</button>
    <button id="nb-training" onclick="go('training')">Тренинг</button>
    <button id="nb-profile" onclick="go('profile')" style="display:none">Кабинет</button>
    <button id="nb-admin" onclick="go('admin')" style="display:none">Админ</button>
    <button id="nb-login" onclick="go('login')">Войти</button>
    <button id="nb-logout" onclick="logout()" style="display:none">Выйти</button>
  </nav>
</div>`;
  }
}
customElements.define('app-header', AppHeader);
