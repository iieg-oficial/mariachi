import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4';
import { Result, Spin } from 'antd';
import './index.css'
import { AuthProvider } from '@contexts/AuthContext';
import MainProvider from '@providers/MainProvider';
import ProtectedRoute from '@components/ProtectedRoute';
import RoleProtectedRoute from '@components/RoleProtectedRoute';
import ErrorBoundary from '@components/ErrorBoundary';
import MainLayout from '@components/MainLayout';
import { Navigate } from 'react-router';
import Login from '@pages/Login';
import ChangePassword from '@pages/ChangePassword';

const Users = lazy(() => import('@pages/Users'));
const MenuManager = lazy(() => import('@pages/MenuManager'));
const PageEditor = lazy(() => import('@pages/PageEditor'));
const Media = lazy(() => import('@pages/Media'));
const RevisionQueue = lazy(() => import('@pages/RevisionQueue'));
const MapalabLayers = lazy(() => import('@pages/MapalabLayers'));

const PageFallback = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Spin tip="Cargando..." />
    </div>
);

const withSuspense = (node) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

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
                    { index: true, element: <Navigate to="menu" replace /> },
                    {
                        path: 'users',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <Users />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'revision',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <RevisionQueue />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'menu',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <MenuManager />
                            </RoleProtectedRoute>
                        )
                    },

                    {
                        path: 'pages/edit/:id',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <PageEditor />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'media',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <Media />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/layers',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <MapalabLayers />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'change-password',
                        element: (
                            <ProtectedRoute>
                                <ChangePassword />
                            </ProtectedRoute>
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
], { basename: '/administrador' });

createRoot(document.getElementById('root')).render(
    <AuthProvider>
        <RouterProvider router={router} />
    </AuthProvider>
);
