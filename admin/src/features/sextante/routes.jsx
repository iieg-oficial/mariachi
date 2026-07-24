import { lazy } from 'react';
import { Navigate } from 'react-router';
import RoleProtectedRoute from '@app/guards/RoleProtectedRoute';

const STAFF_ROLES = ['tetlamamakani', 'editora'];
const ADMIN_ROLES = ['tetlamamakani'];

export const buildSextanteRoutes = (withSuspense) => {
    const GeoserverFilesPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.GeoserverFilesPage })));
    const WorkspacesPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.WorkspacesPage })));
    const StylesPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.StylesPage })));
    const LayerExplorerPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.LayerExplorerPage })));
    const SymbolsPage = lazy(() => import('@features/mapalab-symbols').then((m) => ({ default: m.SymbolsPage })));

    const route = (path, Page, roles = STAFF_ROLES) => ({
        path,
        element: withSuspense(
            <RoleProtectedRoute allowedRoles={roles}><Page /></RoleProtectedRoute>,
        ),
    });

    return [
        route('sextante/workspaces', WorkspacesPage, ADMIN_ROLES),
        route('sextante/capas', LayerExplorerPage),
        route('sextante/estilos', StylesPage),
        route('sextante/recursos', GeoserverFilesPage),
        route('sextante/simbolos', SymbolsPage, ADMIN_ROLES),
        { path: 'mapalab/recursos-geoserver', element: <Navigate to="/sextante/recursos" replace /> },
        { path: 'mapalab/simbolos', element: <Navigate to="/sextante/simbolos" replace /> },
    ];
};
