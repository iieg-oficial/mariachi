import { lazy } from 'react';
import { Navigate } from 'react-router';
import PermissionRoute from '@app/guards/PermissionRoute';

const ACTIVIDAD_VIEW = ['mariachi.actividad.view'];

export const buildHuachicolRoutes = (withSuspense) => {
    const Monitoreo = lazy(() => import('@features/monitoreo').then((m) => ({ default: m.MonitoreoPage })));
    const Telemetria = lazy(() => import('@features/telemetria').then((m) => ({ default: m.TelemetriaPage })));
    const Actividad = lazy(() => import('@features/actividad'));
    const Nodos = lazy(() => import('@features/nodos').then((m) => ({ default: m.NodosPage })));

    const route = (path, Page) => ({
        path,
        element: withSuspense(
            <PermissionRoute anyOf={ACTIVIDAD_VIEW}><Page /></PermissionRoute>,
        ),
    });

    return [
        route('huachicol/observabilidad', Monitoreo),
        route('huachicol/servidores', Nodos),
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
