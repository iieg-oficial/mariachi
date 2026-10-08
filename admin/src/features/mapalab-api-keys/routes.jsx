import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';


export const buildMapalabApiKeysRoutes = (withSuspense) => {
    const MapalabApiKeysPage = lazy(() => import('@features/mapalab-api-keys').then((m) => ({ default: m.MapalabApiKeysPage })));
    return [
        { path: 'mapalab/api-keys', element: withSuspense(<PermissionRoute anyOf={['mariachi.mapalab_llaves.manage']}><MapalabApiKeysPage /></PermissionRoute>) },
    ];
};
