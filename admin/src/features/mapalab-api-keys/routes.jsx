import { lazy } from 'react';
import RoleProtectedRoute from '@app/guards/RoleProtectedRoute';


export const buildMapalabApiKeysRoutes = (withSuspense) => {
    const MapalabApiKeysPage = lazy(() => import('@features/mapalab-api-keys').then((m) => ({ default: m.MapalabApiKeysPage })));
    return [
        { path: 'mapalab/api-keys', element: withSuspense(<RoleProtectedRoute allowedRoles={['tetlamamakani']}><MapalabApiKeysPage /></RoleProtectedRoute>) },
    ];
};
