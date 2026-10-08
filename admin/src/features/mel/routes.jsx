import { lazy } from 'react';
import { Navigate } from 'react-router';
import PermissionRoute from '@app/guards/PermissionRoute';

const MEL_VIEW = ['mariachi.mel.view', 'mariachi.identidad.view'];

export const buildMelRoutes = (withSuspense) => {
    const MelPage = lazy(() => import('@features/mel').then((m) => ({ default: m.MelPage })));

    return [
        {
            path: 'mel',
            element: withSuspense(
                <PermissionRoute anyOf={MEL_VIEW}><MelPage /></PermissionRoute>,
            ),
        },
        { path: 'identidad', element: <Navigate to='/mel' replace /> },
    ];
};
