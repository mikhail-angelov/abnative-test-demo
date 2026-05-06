import bcrypt from 'bcryptjs';
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

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@abnative.ru';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Администратор';

  const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE email = ?').get(adminEmail) as any;
  if (adminCount.cnt === 0) {
    const hash = bcrypt.hashSync(adminPass, 10);
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
      'u1', adminName, adminEmail, hash, 'admin'
    );
    console.log('Seeded admin user (' + adminEmail + ' / ' + adminPass + ')');
  }

  const taskCount = db.prepare('SELECT COUNT(*) as cnt FROM tasks').get() as any;
  if (taskCount.cnt === 0) {
    const tasks: Task[] = [
      {
        // Задание 1 — утверждение (шкала согласия). Единственный вопрос с 2 вариантами
        id: 't1',
        name: 'Задание 1. Понимание горизонтальной абнотивности',
        description: 'Оцените своё понимание определения и структуры.',
        numQuestions: 1,
        questions: [
          {
            text: 'ГОРИЗОНТАЛЬНАЯ АБНОТИВНОСТЬ – психологическое свойство, которое представляет собой готовность к сотрудничеству с одаренными членами команды, в ходе которого выявляется, поддерживается и реализуется их потенциал на пути достижения общей цели. Структура горизонтальной абнотивности является сложной и включает в себя когнитивный, социальный и эмоционально-регулятивный компоненты. Когнитивный компонент – психологические знания и способность понимать поведение талантливых сотрудников. Социальный компонент отражает готовность к построению взаимоотношений и эффективных коммуникаций с одаренными коллегами. Эмоционально-регулятивный – предполагает проявление эмпатии по отношению к одаренному коллеге. Способность увидеть потенциал, возможности и таланты среди коллег из разных функциональных подразделений или сфер деятельности позволяет создать высокоэффективную команду.',
            options: [
              { text: 'Не согласен', c: false },
              { text: 'Согласен', c: true }
            ],
            expl: 'МОЛОДЕЦ! Определение и структура горизонтальной абнотивности усвоены верно.'
          }
        ]
      },
      {
        // Задание 2 — классический вопрос с 4 вариантами
        id: 't2',
        name: 'Задание 2. Коммуникация в команде',
        description: 'Как поступить в сложной ситуации с коллегой?',
        numQuestions: 1,
        questions: [
          {
            text: 'Коллега часто предлагает нестандартные, но сложные для понимания остальных решения. На совещании вы не понимаете его логику. Как вы поступите?',
            options: [
              { text: 'Скажу, что это слишком сложно, и предложу вернуться к привычному подходу', c: false },
              { text: 'Промолчу, чтобы не показаться некомпетентным, и позже попрошу объяснить кого-то другого', c: false },
              { text: 'Сразу после его выступления задам уточняющие вопросы: «Поможешь разобраться, как ты пришёл к такому выводу?»', c: true },
              { text: 'Пожалуюсь руководителю, что коллега говорит непонятно и мешает работе.', c: false }
            ],
            expl: 'Готовность к коммуникации — это прямое, уважительное и своевременное прояснение непонимания, а не избегание или жалобы.'
          }
        ]
      }
    ];
    for (const task of tasks) {
      db.prepare('INSERT INTO tasks (id, name, description, num_questions, data) VALUES (?, ?, ?, ?, ?)').run(
        task.id, task.name, task.description, task.numQuestions, JSON.stringify(task.questions)
      );
    }
    console.log('Seeded ' + tasks.length + ' default tasks');
  }
}
