import { lazy } from 'react';
import { Navigate } from 'react-router';
import PermissionRoute from '@app/guards/PermissionRoute';

const REPORTES_VIEW = ['mariachi.colibri_reportes.view'];
const CONFIG_MANAGE = ['mariachi.colibri_config.manage'];

export const buildColibriRoutes = (withSuspense) => {
    const ColibriResumenPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.ResumenPage })));
    const ReportesListPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.ReportesListPage })));
    const TiposPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.TiposPage })));
    const DireccionesPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.DireccionesPage })));
    const SourceAppsPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.SourceAppsPage })));
    const RoutesPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.RoutesPage })));

    const route = (path, Page, anyOf = REPORTES_VIEW) => ({
        path,
        element: withSuspense(
            <PermissionRoute anyOf={anyOf}><Page /></PermissionRoute>,
        ),
    });

    return [
        route('colibri', ColibriResumenPage),
        route('colibri/reportes', ReportesListPage),
        route('colibri/tipos', TiposPage, CONFIG_MANAGE),
        route('colibri/direcciones', DireccionesPage, CONFIG_MANAGE),
        route('colibri/source-apps', SourceAppsPage, CONFIG_MANAGE),
        route('colibri/routes', RoutesPage, CONFIG_MANAGE),
        { path: 'reportes', element: <Navigate to="/colibri/reportes" replace /> },
    ];
};
