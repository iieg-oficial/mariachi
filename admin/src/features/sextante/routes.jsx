import { lazy } from 'react';
import { Navigate } from 'react-router';
import PermissionRoute from '@app/guards/PermissionRoute';

const GEOSERVER_VIEW = ['mariachi.geoserver.view'];
const GEOSERVER_MANAGE = ['mariachi.geoserver.manage'];
const MAPALAB_MANAGE = ['mariachi.mapalab.manage'];

export const buildSextanteRoutes = (withSuspense) => {
    const GeoserverFilesPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.GeoserverFilesPage })));
    const WorkspacesPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.WorkspacesPage })));
    const StylesPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.StylesPage })));
    const LayerExplorerPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.LayerExplorerPage })));
    const FontsPage = lazy(() => import('@features/sextante').then((m) => ({ default: m.FontsPage })));
    const SymbolsPage = lazy(() => import('@features/mapalab-symbols').then((m) => ({ default: m.SymbolsPage })));

    const route = (path, Page, anyOf = GEOSERVER_VIEW) => ({
        path,
        element: withSuspense(
            <PermissionRoute anyOf={anyOf}><Page /></PermissionRoute>,
        ),
    });

    return [
        route('sextante/workspaces', WorkspacesPage, GEOSERVER_MANAGE),
        route('sextante/capas', LayerExplorerPage),
        route('sextante/estilos', StylesPage),
        route('sextante/recursos', GeoserverFilesPage),
        route('sextante/tipografias', FontsPage),
        route('sextante/simbolos', SymbolsPage, MAPALAB_MANAGE),
        { path: 'mapalab/recursos-geoserver', element: <Navigate to="/sextante/recursos" replace /> },
        { path: 'mapalab/simbolos', element: <Navigate to="/sextante/simbolos" replace /> },
    ];
};
