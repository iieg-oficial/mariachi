import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';
import { VINE_HABILITADO } from '@features/vine/constants/flags';

const VINE_VIEW = ['mariachi.vine.view'];

export const buildVineRoutes = (withSuspense) => {
    if (!VINE_HABILITADO) return [];

    const EstadisticasPage = lazy(
        () => import('@features/vine').then((m) => ({ default: m.EstadisticasPage })),
    );

    return [
        {
            path: 'vine/estadisticas',
            element: withSuspense(
                <PermissionRoute anyOf={VINE_VIEW}><EstadisticasPage /></PermissionRoute>,
            ),
        },
    ];
};
