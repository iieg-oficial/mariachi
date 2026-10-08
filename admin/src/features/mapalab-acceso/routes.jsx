import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';
import { ENTORNO_NO_PROD } from '@app/sider-alcance';


export const buildMapalabAccesoRoutes = (withSuspense) => {
    if (!ENTORNO_NO_PROD) return [];
    const MapalabAccesoPage = lazy(() => import('@features/mapalab-acceso').then((m) => ({ default: m.MapalabAccesoPage })));
    return [
        { path: 'mapalab/acceso', element: withSuspense(<PermissionRoute anyOf={['mariachi.mapalab_acceso.manage']}><MapalabAccesoPage /></PermissionRoute>) },
    ];
};
