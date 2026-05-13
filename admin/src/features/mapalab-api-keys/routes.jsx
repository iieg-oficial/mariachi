import { lazy } from 'react';
import RoleProtectedRoute from '@app/guards/RoleProtectedRoute';

const MapalabApiKeysPage = lazy(() => import('@features/mapalab-api-keys').then((m) => ({ default: m.MapalabApiKeysPage })));


export const buildMapalabApiKeysRoutes = (withSuspense) => [
    { path: 'mapalab/api-keys', element: withSuspense(<RoleProtectedRoute allowedRoles={['tetlamamakani']}><MapalabApiKeysPage /></RoleProtectedRoute>) },
];
