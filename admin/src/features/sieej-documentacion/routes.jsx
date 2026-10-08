import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';
import { PERMISO_VER } from './constants/secciones';

export const buildSieejDocumentacionRoutes = (withSuspense) => {
    const PipelinesPage = lazy(() => import('@features/sieej-documentacion').then((m) => ({ default: m.PipelinesPage })));
    const PipelineEditorPage = lazy(() => import('@features/sieej-documentacion').then((m) => ({ default: m.PipelineEditorPage })));

    return [
        {
            path: 'sieej/documentacion',
            element: withSuspense(<PermissionRoute anyOf={[PERMISO_VER]}><PipelinesPage /></PermissionRoute>),
        },
        {
            path: 'sieej/documentacion/:clave',
            element: withSuspense(<PermissionRoute anyOf={[PERMISO_VER]}><PipelineEditorPage /></PermissionRoute>),
        },
    ];
};
