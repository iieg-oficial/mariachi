import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';


export const buildMapalabAccesoRoutes = (withSuspense) => {
    const MapalabAccesoPage = lazy(() => import('@features/mapalab-acceso').then((m) => ({ default: m.MapalabAccesoPage })));
    return [
        { path: 'mapalab/acceso', element: withSuspense(<PermissionRoute anyOf={['mariachi.mapalab_acceso.manage']}><MapalabAccesoPage /></PermissionRoute>) },
    ];
};
