import { lazy } from 'react';
import PermissionRoute from '@app/guards/PermissionRoute';

const INTRANET_VIEW = ['mariachi.intranet.view'];

const PAGINAS = [
    ['intranet/carrusel', 'CarruselPage'],
    ['intranet/galeria', 'GaleriaPage'],
    ['intranet/documentos', 'DocumentosPage'],
    ['intranet/pie-de-pagina', 'EnlacesPage'],
    ['intranet/sitios', 'SitiosPage'],
    ['intranet/herramientas', 'HerramientasPage'],
];

export const buildIntranetRoutes = (withSuspense) => PAGINAS.map(([path, nombre]) => {
    const Pagina = lazy(() => import('@features/intranet').then((m) => ({ default: m[nombre] })));
    return {
        path,
        element: withSuspense(
            <PermissionRoute anyOf={INTRANET_VIEW}><Pagina /></PermissionRoute>,
        ),
    };
});
