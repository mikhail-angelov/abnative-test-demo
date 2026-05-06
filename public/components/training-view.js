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
    document.addEventListener('app:ready', () => this._bind());
  }

  _bind() {
    subscribe((s, prev) => {
      if (s.page === 'training' && prev.page !== 'training') renderTaskList();
      if (s.quizState !== prev.quizState) this._onQuizChange(s.quizState, prev.quizState);
    });
  }

  _onQuizChange(quiz, prevQuiz) {
    const welcome = this.querySelector('#welcome-screen');
    const quizScreen = this.querySelector('#quiz-screen');
    if (!quiz && prevQuiz) {
      welcome.style.display = '';
      quizScreen.style.display = 'none';
      renderTaskList();
    } else if (quiz && !prevQuiz) {
      welcome.style.display = 'none';
      quizScreen.style.display = 'block';
      this.querySelector('#q-results').style.display = 'none';
      this.querySelector('#q-task-name').textContent = quiz.taskName;
      renderQuestion();
    }
  }
}
customElements.define('training-view', TrainingView);
