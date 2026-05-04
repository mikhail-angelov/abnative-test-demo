export interface Question {
    text: string;
    options: {
        text: string;
        c: boolean;
    }[];
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
export declare function seedDefaults(): void;
