import { authHandlers } from './auth';
import { usersHandlers } from './users';
import { menuHandlers } from './menu';
import { pageHandlers } from './pages';
import { mediaHandlers } from './media';

export const handlers = [
    ...authHandlers,
    ...usersHandlers,
    ...menuHandlers,
    ...pageHandlers,
    ...mediaHandlers
];
