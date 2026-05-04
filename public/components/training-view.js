class TrainingView extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="container">
  <div id="welcome-screen">
    <h2>Добро пожаловать в тренинг!</h2>
    <p>Выберите задание:</p>
    <div id="task-list"></div>
  </div>
  <div id="quiz-screen" style="display:none">
    <div class="qh">
      <div><span id="q-task-name"></span> <span id="q-progress"></span></div>
      <button class="btn btn-s" onclick="exitQuiz()">← К заданиям</button>
    </div>
    <div id="q-area"></div>
    <div id="q-results" style="display:none"></div>
  </div>
</div>`;
  }
}
customElements.define('training-view', TrainingView);
