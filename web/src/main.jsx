import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4';
import './index.css'
import MainProvider from '@providers/MainProvider';
import Home from '@pages/Home';
import DynamicPage from '@pages/DynamicPage';

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
            { path: '*', element: <DynamicPage /> },
        ],
    },
]);

createRoot(document.getElementById('root')).render(
    <RouterProvider router={router} />
)
