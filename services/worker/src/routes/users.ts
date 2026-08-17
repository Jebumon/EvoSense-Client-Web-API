import { Hono } from 'hono';
import { getUsersController, createUserController, updateUserController, deleteUserController } from '../controllers/userController';
import { requireRole } from '../middleware/auth';

const usersApp = new Hono();

usersApp.get('/', requireRole(['admin', 'manager', 'operator', 'viewer']), getUsersController);
usersApp.post('/', requireRole(['admin', 'manager', 'operator', 'viewer']), createUserController);
usersApp.put('/:id', requireRole(['admin', 'manager', 'operator', 'viewer']), updateUserController);
usersApp.delete('/:id', requireRole(['admin', 'manager', 'operator', 'viewer']), deleteUserController);

export default usersApp;
