import { User } from './seed';
export declare function findUserByEmail(email: string): User | undefined;
export declare function findUserById(id: string): User | undefined;
export declare function createUser(name: string, email: string, password: string, role?: string): User;
export declare function validatePassword(password: string, hash: string): boolean;
