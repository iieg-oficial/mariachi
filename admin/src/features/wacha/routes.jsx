import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';

const WACHA_MANAGE = ['mariachi.sistema.manage'];

export const buildWachaRoutes = (withSuspense) => {
    const WachaPage = lazy(() => import('@features/wacha').then((m) => ({ default: m.WachaPage })));

    return [
        {
            path: 'wacha/camaras',
            element: withSuspense(
                <PermissionRoute anyOf={WACHA_MANAGE}><WachaPage /></PermissionRoute>,
            ),
        },
    ];
};
