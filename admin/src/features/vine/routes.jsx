import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';
import { VINE_HABILITADO } from '@features/vine/constants/flags';

const VINE_VIEW = ['mariachi.vine.view'];

export const buildVineFullscreenRoutes = (withSuspense) => {
    if (!VINE_HABILITADO) return [];

    const PersonalGridPage = lazy(
        () => import('@features/vine').then((m) => ({ default: m.PersonalGridPage })),
    );

    return [
        {
            path: 'vine/personal/tabla',
            element: withSuspense(
                <PermissionRoute anyOf={['mariachi.vine_personas.update']}>
                    <PersonalGridPage />
                </PermissionRoute>,
            ),
        },
    ];
};

export const buildVineRoutes = (withSuspense) => {
    if (!VINE_HABILITADO) return [];

    const EstadisticasPage = lazy(
        () => import('@features/vine').then((m) => ({ default: m.EstadisticasPage })),
    );
    const PersonalPage = lazy(
        () => import('@features/vine').then((m) => ({ default: m.PersonalPage })),
    );
    const IncidenciasPage = lazy(
        () => import('@features/vine').then((m) => ({ default: m.IncidenciasPage })),
    );
    const CatalogosPage = lazy(
        () => import('@features/vine').then((m) => ({ default: m.CatalogosPage })),
    );

    return [
        {
            path: 'vine/estadisticas',
            element: withSuspense(
                <PermissionRoute anyOf={VINE_VIEW}><EstadisticasPage /></PermissionRoute>,
            ),
        },
        {
            path: 'vine/personal',
            element: withSuspense(
                <PermissionRoute anyOf={VINE_VIEW}><PersonalPage /></PermissionRoute>,
            ),
        },
        {
            path: 'vine/catalogos',
            element: withSuspense(
                <PermissionRoute anyOf={VINE_VIEW}><CatalogosPage /></PermissionRoute>,
            ),
        },
        {
            path: 'vine/incidencias',
            element: withSuspense(
                <PermissionRoute anyOf={['mariachi.vine_personas.view']}>
                    <IncidenciasPage />
                </PermissionRoute>,
            ),
        },
    ];
};
