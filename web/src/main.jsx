import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4';
import './index.css'
import MainProvider from '@providers/MainProvider';
import Home from '@pages/Home';
import ConocenosPage from '@pages/ConocenosPage';
import SistemasPage from '@pages/SistemasPage';
import DatosAbiertosPage from '@pages/DatosAbiertosPage';
import ComunidadPage from '@pages/ComunidadPage';
import TransparenciaPage from '@pages/TransparenciaPage';
import TramitesPage from '@pages/TramitesPage';

const env = import.meta.env;
const MODE = env.VITE_NODE_ENV
const isDev = MODE === 'development';
const trackingID = env.VITE_GOOGLE_ANALYTICS_ID;

isDev && console.info('¡Tú estás viendo esto, porque estás en modo de desarrollo!');

if (trackingID && trackingID.startsWith('G-')) {
    ReactGA.initialize(trackingID, {
        testMode: MODE,
        gaOptions: {
            cookieFlags: isDev ? 'SameSite=None;Secure' : 'Lax'
        }
    });
} else if (isDev) {
    console.info('Google Analytics no inicializado: VITE_GOOGLE_ANALYTICS_ID no definido o inválido');
}

const router = createBrowserRouter([
    {
        element: <MainProvider />,
        children: [
            { index: true, element: <Home /> },
            { path: '/conocenos', element: <ConocenosPage /> },
            { path: '/sistemas', element: <SistemasPage /> },
            { path: '/datos-abiertos', element: <DatosAbiertosPage /> },
            { path: '/comunidad', element: <ComunidadPage /> },
            { path: '/transparencia', element: <TransparenciaPage /> },
            { path: '/tramites', element: <TramitesPage /> },
            { path: '*', element: <h1 className="text-4xl text-center mt-20">404 - Página No Encontrada</h1> },
        ],
    },
]);

createRoot(document.getElementById('root')).render(
    <RouterProvider router={router} />
)
