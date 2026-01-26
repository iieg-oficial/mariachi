import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4';
import { Result } from 'antd';
import './index.css'
import { AuthProvider } from '@contexts/AuthContext';
import MainProvider from '@providers/MainProvider';
import ProtectedRoute from '@components/ProtectedRoute';
import RoleProtectedRoute from '@components/RoleProtectedRoute';
import ErrorBoundary from '@components/ErrorBoundary';
import MainLayout from '@components/MainLayout';
import Home from '@pages/Home';
import Login from '@pages/Login';
import Users from '@pages/Users';
import Layouts from '@pages/Layouts';
import MenuManager from '@pages/MenuManager';
import Icons from '@pages/Icons';
import Documentation from '@pages/Documentation';
import PageEditor from '@pages/PageEditor';
import Pages from '@pages/Pages';
import Styles from '@pages/Styles';
import History from '@pages/History';
import Media from '@pages/Media';
import Fonts from '@pages/Fonts';
import Approvals from '@pages/Approvals';
import ContentSearch from '@pages/ContentSearch';
import Trash from '@pages/Trash';
import ImportExport from '@pages/ImportExport';
import SitemapManager from '@pages/SitemapManager';
import RobotsManager from '@pages/RobotsManager';
import RedirectsManager from '@pages/RedirectsManager';
import Analytics from '@pages/Analytics';
import '@ant-design/v5-patch-for-react-19';

const { DEV, VITE_GOOGLE_ANALYTICS_ID } = import.meta.env;

if (VITE_GOOGLE_ANALYTICS_ID && VITE_GOOGLE_ANALYTICS_ID.startsWith('G-')) {
    ReactGA.initialize(VITE_GOOGLE_ANALYTICS_ID, {
        testMode: DEV,
        gaOptions: {
            cookieFlags: DEV ? 'SameSite=None;Secure' : 'Lax'
        }
    });
} else if (DEV) {
    console.info('Google Analytics no inicializado: VITE_GOOGLE_ANALYTICS_ID no definido o inválido');
}

const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
        errorElement: <ErrorBoundary />
    }, {
        element: (
            <ProtectedRoute>
                <MainProvider />
            </ProtectedRoute>
        ),
        errorElement: <ErrorBoundary />,
        children: [
            {
                element: <MainLayout />,
                errorElement: <ErrorBoundary />,
                children: [
                    { index: true, element: <Home /> },
                    {
                        path: 'users',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <Users />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'history',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <History />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'approvals',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <Approvals />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'layouts',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'diseñadora']}>
                                <Layouts />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'menu',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'diseñadora']}>
                                <MenuManager />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'icons',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'diseñadora']}>
                                <Icons />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'documentation',
                        element: (
                            <Documentation />
                        )
                    },
                    {
                        path: 'pages',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora', 'diseñadora']}>
                                <Pages />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'search',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora', 'diseñadora']}>
                                <ContentSearch />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'trash',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora', 'diseñadora']}>
                                <Trash />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'import-export',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <ImportExport />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'sitemap',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <SitemapManager />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'robots',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <RobotsManager />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'redirects',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <RedirectsManager />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'analytics',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <Analytics />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'pages/edit/:id',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora', 'diseñadora']}>
                                <PageEditor />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'media',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora', 'diseñadora']}>
                                <Media />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'fonts',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'diseñadora']}>
                                <Fonts />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'styles',
                        element: (
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'diseñadora']}>
                                <Styles />
                            </RoleProtectedRoute>
                        )
                    }, {
                        path: '*',
                        element: (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                                <Result
                                    status="404"
                                    title="404"
                                    subTitle="Lo sentimos, la página que visitaste no existe."
                                />
                            </div>
                        )
                    },
                ]
            }
        ],
    },
]);

createRoot(document.getElementById('root')).render(
    <AuthProvider>
        <RouterProvider router={router} />
    </AuthProvider>
);
