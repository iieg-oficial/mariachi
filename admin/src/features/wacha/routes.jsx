import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';

const WACHA_MANAGE = ['mariachi.wacha.view'];

export const buildWachaRoutes = (withSuspense) => {
    const WachaPage = lazy(() => import('@features/wacha').then((m) => ({ default: m.WachaPage })));
    const VivoPage = lazy(() => import('@features/wacha').then((m) => ({ default: m.VivoPage })));

    return [
        {
            path: 'wacha/camaras',
            element: withSuspense(
                <PermissionRoute anyOf={WACHA_MANAGE}><WachaPage /></PermissionRoute>,
            ),
        },
        {
            path: 'wacha/vivo',
            element: withSuspense(
                <PermissionRoute anyOf={WACHA_MANAGE}><VivoPage /></PermissionRoute>,
            ),
        },
    ];
};

export const buildWachaFullscreenRoutes = (withSuspense) => {
    const VivoPantallaPage = lazy(() => import('@features/wacha').then((m) => ({ default: m.VivoPantallaPage })));

    return [
        {
            path: 'wacha/vivo/pantalla',
            element: withSuspense(
                <PermissionRoute anyOf={WACHA_MANAGE}><VivoPantallaPage /></PermissionRoute>,
            ),
        },
    ];
};
