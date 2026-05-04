class AdminPanel extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="container">
  <h2>Управление заданиями</h2>
  <div class="af" id="admin-form">
    <h3 id="form-title">Новое задание</h3>
    <div class="fg"><label>Название</label><input type="text" id="task-name" placeholder="Основы абнотивности"></div>
    <div class="fg"><label>Описание</label><textarea id="task-desc" placeholder="Краткое описание"></textarea></div>
    <div class="fg"><label>Количество вопросов</label><div class="nqg"><input type="number" id="task-num" value="5" min="1" max="50"> <span style="color:#6a7a6a;">вопросов</span></div></div>
    <div class="fg"><label>Вопросы</label><div id="q-container"></div><button class="btn btn-s" onclick="addQ()">+ Добавить вопрос</button></div>
    <div style="margin-top:1rem;display:flex;gap:.5rem"><button class="btn btn-g" onclick="saveTask()">Сохранить</button><button class="btn btn-s" onclick="cancelEdit()">Отмена</button></div>
  </div>
  <div id="admin-list"></div>
</div>`;
  }
}
customElements.define('admin-panel', AdminPanel);
