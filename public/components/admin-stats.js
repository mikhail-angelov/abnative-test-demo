class AdminStats extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
<div class="admin-stats-wrap">
  <div class="admin-stats-hdr">
    <h2>Статистика участников</h2>
  </div>
  <div id="admin-stats-content">
    <div class="nt">Загрузка...</div>
  </div>
</div>`;
  }

  async loadStats() {
    const el = document.getElementById('admin-stats-content');
    if (!el) return;
    try {
      const res = await api('GET', '/api/admin/stats');
      const sessions = res.data.sessions || [];
      if (sessions.length === 0) {
        el.innerHTML = '<div class="nt">Пока нет результатов тренировок.</div>';
        return;
      }

      // Group sessions by user
      const userMap = {};
      for (const s of sessions) {
        if (!userMap[s.userId]) {
          userMap[s.userId] = { name: s.userName, email: s.userEmail, sessions: [] };
        }
        userMap[s.userId].sessions.push(s);
      }

      const users = Object.values(userMap);
      let html = '';

      for (const u of users) {
        const totalSessions = u.sessions.length;
        let totalCorrect = 0, totalAll = 0;
        for (const s of u.sessions) { totalCorrect += s.correct; totalAll += s.total; }
        const avgPct = totalAll > 0 ? Math.round(totalCorrect / totalAll * 100) : 0;

        html += '<div class="as-card">';
        html += '<div class="as-user">';
        html += '<div class="as-user-info">';
        html += '<strong>' + esc(u.name) + '</strong>';
        html += '<span class="as-email">' + esc(u.email) + '</span>';
        html += '</div>';
        html += '<div class="as-summary">';
        html += '<div class="as-stat"><span class="as-num">' + totalSessions + '</span> тренировок</div>';
        html += '<div class="as-stat"><span class="as-num">' + totalCorrect + '/' + totalAll + '</span> верных</div>';
        html += '<div class="as-stat"><span class="as-num">' + avgPct + '%</span> средний</div>';
        html += '</div>';
        html += '</div>';

        // Session details table
        html += '<table class="as-table">';
        html += '<tr><th>Дата</th><th>Задание</th><th>Результат</th></tr>';
        for (const s of u.sessions) {
          const cls = s.pct >= 60 ? 'pas' : 'fal';
          html += '<tr><td>' + esc(s.date) + '</td><td>' + esc(s.taskName) + '</td><td class="' + cls + '">' + s.correct + '/' + s.total + ' (' + s.pct + '%)</td></tr>';
        }
        html += '</table>';
        html += '</div>';
      }

      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<div class="nt">Ошибка загрузки статистики.</div>';
    }
  }
}
customElements.define('admin-stats', AdminStats);
