import { getDb } from './db';

export interface Question {
  text: string;
  options: { text: string; c: boolean }[];
  expl: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  numQuestions: number;
  questions: Question[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface Session {
  id: string;
  user_id: string;
  task_id: string;
  task_name: string;
  correct: number;
  total: number;
  pct: number;
  date: string;
}

export function seedDefaults(): void {
  const db = getDb();

  const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE email = ?').get('admin@abnative.ru') as any;
  if (adminCount.cnt === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
      'u1', 'Администратор', 'admin@abnative.ru', hash, 'admin'
    );
    console.log('Seeded admin user (admin@abnative.ru / admin123)');
  }

  const taskCount = db.prepare('SELECT COUNT(*) as cnt FROM tasks').get() as any;
  if (taskCount.cnt === 0) {
    const defaultTask: Task = {
      id: 't1',
      name: 'Основы горизонтальной абнотивности',
      description: 'Проверьте знания об определении и структуре.',
      numQuestions: 5,
      questions: [
        {
          text: 'Что означает термин «абнотивность»?',
          options: [
            { text: 'Способность к абстрактному мышлению', c: false },
            { text: 'Способность видеть в других способности и одаренность', c: true },
            { text: 'Склонность к индивидуальной работе', c: false }
          ],
          expl: 'Неологизм от «note» (замечать) + «about» (вокруг).'
        },
        {
          text: 'Кто из ученых внёс вклад в теорию абнотивности?',
          options: [
            { text: 'Кашапов М.М.', c: true },
            { text: 'Выготский Л.С.', c: false },
            { text: 'Леонтьев А.Н.', c: false }
          ],
          expl: 'Кашапов М.М. — д.пс.н., профессор ЯрГУ им. П.Г. Демидова.'
        },
        {
          text: 'Сколько компонентов в структуре горизонтальной абнотивности?',
          options: [
            { text: 'Два', c: false },
            { text: 'Три', c: true },
            { text: 'Четыре', c: false }
          ],
          expl: 'Когнитивный, социальный и эмоционально-регулятивный.'
        },
        {
          text: 'Что отражает социальный компонент абнотивности?',
          options: [
            { text: 'Понимание поведения талантливых сотрудников', c: false },
            { text: 'Готовность к построению взаимоотношений с одаренными коллегами', c: true },
            { text: 'Проявление эмпатии к коллегам', c: false }
          ],
          expl: 'Социальный компонент отражает готовность к построению взаимоотношений и коммуникаций с одаренными коллегами.'
        },
        {
          text: 'Кто предложил термин «абнотивность»?',
          options: [
            { text: 'Московская психологическая школа', c: false },
            { text: 'Ярославская психологическая школа', c: true },
            { text: 'Санкт-Петербургская психологическая школа', c: false }
          ],
          expl: 'Термин предложен Ярославской психологической школой.'
        }
      ]
    };
    db.prepare('INSERT INTO tasks (id, name, description, num_questions, data) VALUES (?, ?, ?, ?, ?)').run(
      defaultTask.id, defaultTask.name, defaultTask.description, defaultTask.numQuestions, JSON.stringify(defaultTask.questions)
    );
    console.log('Seeded default task');
  }
}
