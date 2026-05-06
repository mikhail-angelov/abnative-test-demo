class AdminPanel extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="admin-wrap">
  <div class="admin-list-col">
    <div class="admin-list-hdr">
      <h2>Задания</h2>
      <button class="btn btn-g" onclick="newTask()">+ Новое</button>
    </div>
    <div id="admin-list"></div>
  </div>
  <div class="admin-edit-col">
    <div class="admin-edit-ph" id="admin-edit-ph">Выберите задание из списка или создайте новое</div>
    <div id="admin-form" style="display:none">
      <h3 id="form-title" style="margin-bottom:1.5rem">Новое задание</h3>
      <div class="fg"><label>Название</label><input type="text" id="task-name" placeholder="Основы абнотивности"></div>
      <div class="fg"><label>Описание</label><textarea id="task-desc" placeholder="Краткое описание"></textarea></div>
      <div class="fg"><label>Количество вопросов</label><div class="nqg"><input type="number" id="task-num" value="5" min="1" max="50"> <span style="color:#6a7a6a;">вопросов</span></div></div>
      <div class="fg"><label>Вопросы</label><div id="q-container"></div><button class="btn btn-s" onclick="addQ()">+ Добавить вопрос</button></div>
      <div style="margin-top:1rem;display:flex;gap:.5rem">
        <button class="btn btn-g" onclick="saveTask()">Сохранить</button>
        <button class="btn btn-s" onclick="cancelEdit()">Отмена</button>
      </div>
    </div>
  </div>
</div>`;
    document.addEventListener('app:ready', () => this._bind());
  }

  _bind() {
    subscribe((s, prev) => {
      if (s.page === 'admin' && prev.page !== 'admin') renderAdminList();
      // editingId changed — update selection CSS without re-fetching
      if (s.editingId !== prev.editingId) {
        this.querySelectorAll('#admin-list .tc[data-id]').forEach(el => {
          el.classList.toggle('selected', el.dataset.id === s.editingId);
        });
      }
    });
  }
}
customElements.define('admin-panel', AdminPanel);
