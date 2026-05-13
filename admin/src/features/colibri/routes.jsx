import { lazy } from 'react';
import { Navigate } from 'react-router';
import RoleProtectedRoute from '@app/guards/RoleProtectedRoute';

const STAFF_ROLES = ['tetlamamakani', 'editora'];
const ADMIN_ROLES = ['tetlamamakani'];

export const buildColibriRoutes = (withSuspense) => {
    const ColibriResumenPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.ResumenPage })));
    const ReportesListPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.ReportesListPage })));
    const TiposPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.TiposPage })));
    const DireccionesPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.DireccionesPage })));
    const SourceAppsPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.SourceAppsPage })));
    const RoutesPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.RoutesPage })));
    const IntegracionPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.IntegracionPage })));

    const route = (path, Page, roles = STAFF_ROLES) => ({
        path,
        element: withSuspense(
            <RoleProtectedRoute allowedRoles={roles}><Page /></RoleProtectedRoute>,
        ),
    });

    return [
        route('colibri', ColibriResumenPage),
        route('colibri/reportes', ReportesListPage),
        route('colibri/tipos', TiposPage, ADMIN_ROLES),
        route('colibri/direcciones', DireccionesPage, ADMIN_ROLES),
        route('colibri/source-apps', SourceAppsPage, ADMIN_ROLES),
        route('colibri/routes', RoutesPage, ADMIN_ROLES),
        route('colibri/integracion', IntegracionPage, ADMIN_ROLES),
        { path: 'reportes', element: <Navigate to="/colibri/reportes" replace /> },
    ];
};
