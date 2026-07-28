import { lazy } from 'react';
import RoleProtectedRoute from '@app/guards/RoleProtectedRoute';

const ADMIN_ROLES = ['tetlamamakani'];

export const buildIdentidadRoutes = (withSuspense) => {
    const IdentidadPage = lazy(() => import('@features/identidad').then((m) => ({ default: m.IdentidadPage })));

    return [
        {
            path: 'identidad',
            element: withSuspense(
                <RoleProtectedRoute allowedRoles={ADMIN_ROLES}><IdentidadPage /></RoleProtectedRoute>,
            ),
        },
    ];
};
