class AppLogin extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="container">
  <div id="login-form" class="sf">
    <h2>Вход</h2>
    <div class="msg" id="login-error"></div>
    <div class="fg"><label>Email</label><input type="email" id="login-email" placeholder="your@email.com"></div>
    <div class="fg"><label>Пароль</label><input type="password" id="login-pass" placeholder="заглушка"></div>
    <button class="ab" onclick="doLogin()">Войти</button>
    <div class="lnk">Нет аккаунта? <a onclick="showRegister()">Зарегистрироваться</a></div>
  </div>
  <div id="register-form" class="sf" style="display:none">
    <h2>Регистрация</h2>
    <div class="msg" id="reg-msg"></div>
    <div class="fg"><label>Имя</label><input type="text" id="reg-name" placeholder="Иван Иванов"></div>
    <div class="fg"><label>Email</label><input type="email" id="reg-email" placeholder="your@email.com"></div>
    <div class="fg"><label>Пароль</label><input type="password" id="reg-pass" placeholder="минимум 6 символов"></div>
    <button class="ab" onclick="doRegister()">Зарегистрироваться</button>
    <div class="lnk">Уже есть аккаунт? <a onclick="showLogin()">Войти</a></div>
  </div>
</div>`;
  }
}
customElements.define('app-login', AppLogin);
