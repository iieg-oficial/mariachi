import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';

const IDENTIDAD_VIEW = ['mariachi.identidad.view'];

export const buildIdentidadRoutes = (withSuspense) => {
    const IdentidadPage = lazy(() => import('@features/identidad').then((m) => ({ default: m.IdentidadPage })));

    return [
        {
            path: 'identidad',
            element: withSuspense(
                <PermissionRoute anyOf={IDENTIDAD_VIEW}><IdentidadPage /></PermissionRoute>,
            ),
        },
    ];
};
