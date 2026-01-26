import { authHandlers } from './auth';
import { usersHandlers } from './users';
import { layoutsHandlers } from './layouts';
import { menuHandlers } from './menu';
import { iconHandlers } from './icons';
import { pageHandlers } from './pages';
import { styleHandlers } from './styles';
import { historyHandlers } from './history';
import { mediaHandlers } from './media';
import { searchHandlers } from './search';

export const handlers = [
    ...authHandlers,
    ...usersHandlers,
    ...layoutsHandlers,
    ...menuHandlers,
    ...iconHandlers,
    ...pageHandlers,
    ...styleHandlers,
    ...historyHandlers,
    ...mediaHandlers,
    ...searchHandlers
];
