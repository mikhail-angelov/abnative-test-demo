import { Task } from './seed';
export declare function getAllTasks(): any[];
export declare function getTaskById(id: string): Task | undefined;
export declare function saveTask(task: Task): void;
export declare function deleteTask(id: string): void;
