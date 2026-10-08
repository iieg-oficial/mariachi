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
    ['intranet/personas', 'PersonasPage'],
    ['intranet/espacios', 'EspaciosPage'],
    ['intranet/solicitudes', 'SolicitudesPage'],
    ['intranet/eventos', 'EventosPage'],
    ['intranet/festejos', 'FestejosPage'],
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
