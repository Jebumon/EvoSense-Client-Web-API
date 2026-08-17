import type { UserRecord } from '../types';

export const users = new Map<string, UserRecord>();

export const getUserById = (id: string) => users.get(id);
export const getUsers = () => Array.from(users.values());
export const getUserByEmail = (email: string) => Array.from(users.values()).find((user) => user.email === email);
export const saveUser = (user: UserRecord) => users.set(user.id, user);
export const deleteUser = (userId: string) => users.delete(userId);
