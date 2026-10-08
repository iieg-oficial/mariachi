import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';

const FRAMES_MANAGE = ['mariachi.frames.view'];

export const buildFramesRoutes = (withSuspense) => {
    const FramesPage = lazy(() => import('@features/frames').then((m) => ({ default: m.FramesPage })));
    const VivoPage = lazy(() => import('@features/frames').then((m) => ({ default: m.VivoPage })));

    return [
        {
            path: 'frames/camaras',
            element: withSuspense(
                <PermissionRoute anyOf={FRAMES_MANAGE}><FramesPage /></PermissionRoute>,
            ),
        },
        {
            path: 'frames/vivo',
            element: withSuspense(
                <PermissionRoute anyOf={FRAMES_MANAGE}><VivoPage /></PermissionRoute>,
            ),
        },
    ];
};

export const buildFramesFullscreenRoutes = (withSuspense) => {
    const VivoPantallaPage = lazy(() => import('@features/frames').then((m) => ({ default: m.VivoPantallaPage })));
    const CamaraPantallaPage = lazy(() => import('@features/frames').then((m) => ({ default: m.CamaraPantallaPage })));

    return [
        {
            path: 'frames/vivo/pantalla',
            element: withSuspense(
                <PermissionRoute anyOf={FRAMES_MANAGE}><VivoPantallaPage /></PermissionRoute>,
            ),
        },
        {
            path: 'frames/vivo/pantalla/:nombre',
            element: withSuspense(
                <PermissionRoute anyOf={FRAMES_MANAGE}><CamaraPantallaPage /></PermissionRoute>,
            ),
        },
    ];
};
