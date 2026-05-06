class UserProfile extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="container">
  <div class="pc">
    <h2 id="p-name"></h2>
    <p id="p-email" style="color:#6a7a6a;margin-bottom:1rem"></p>
    <div class="sg">
      <div class="si"><div class="nm" id="s-total">0</div><div class="lb">Прохождений</div></div>
      <div class="si"><div class="nm" id="s-correct">0</div><div class="lb">Правильных</div></div>
      <div class="si"><div class="nm" id="s-avg">0%</div><div class="lb">Средний результат</div></div>
    </div>
    <h3>История</h3>
    <div id="p-history"></div>
  </div>
</div>`;
    document.addEventListener('app:ready', () => this._bind());
  }

  _bind() {
    subscribe((s, prev) => {
      if (s.page === 'profile' && prev.page !== 'profile') loadProfile();
    });
  }
}
customElements.define('user-profile', UserProfile);
