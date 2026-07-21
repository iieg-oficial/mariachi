import { lazy } from 'react';
import { Navigate } from 'react-router';
import RoleProtectedRoute from '@app/guards/RoleProtectedRoute';

const ADMIN_ROLES = ['tetlamamakani'];

export const buildHuachicolRoutes = (withSuspense) => {
    const Monitoreo = lazy(() => import('@features/monitoreo').then((m) => ({ default: m.MonitoreoPage })));
    const Telemetria = lazy(() => import('@features/telemetria').then((m) => ({ default: m.TelemetriaPage })));
    const Actividad = lazy(() => import('@features/actividad'));

    const route = (path, Page) => ({
        path,
        element: withSuspense(
            <RoleProtectedRoute allowedRoles={ADMIN_ROLES}><Page /></RoleProtectedRoute>,
        ),
    });

    return [
        route('huachicol/observabilidad', Monitoreo),
        route('huachicol/telemetria', Telemetria),
        route('huachicol/actividad', Actividad),
        { path: 'monitoreo', element: <Navigate to="/huachicol/observabilidad" replace /> },
        { path: 'actividad', element: <Navigate to="/huachicol/actividad" replace /> },
        { path: 'mapalab/stats', element: <Navigate to="/huachicol/telemetria?fuente=mapalab" replace /> },
        {
            path: 'mapalab/stats/sesiones',
            element: <Navigate to="/huachicol/telemetria?fuente=mapalab&tab=sesiones" replace />,
        },
    ];
};
