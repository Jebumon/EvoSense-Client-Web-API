import { Hono } from 'hono';
import { loginController, logoutController, meController } from '../controllers/authController';
import { createCors } from '../middleware/cors';

const authApp = new Hono();

authApp.use('*', createCors());
authApp.post('/login', loginController);
authApp.get('/me', meController);
authApp.post('/logout', logoutController);

export default authApp;
