import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4';
import * as Sentry from '@sentry/react';
import { Result, Spin } from 'antd';
import './index.css'
import { AuthProvider } from '@shared/contexts/AuthContext';
import MainProvider from '@app/providers/MainProvider';
import ProtectedRoute from '@app/guards/ProtectedRoute';
import RoleProtectedRoute from '@app/guards/RoleProtectedRoute';
import ErrorBoundary from '@app/guards/ErrorBoundary';
import MainLayout from '@app/MainLayout';
import { Navigate } from 'react-router';
import Login from '@features/auth/pages/LoginPage';
import ChangePassword from '@features/auth/pages/ChangePasswordPage';

const isDev = import.meta.env.DEV;

if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.VITE_NODE_ENV || (isDev ? 'development' : 'production'),
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: isDev ? 1.0 : 0.1,
        denyUrls: [/youtubei\/v1/, /google-analytics/, /googletagmanager/, /doubleclick\.net/],
    });
}

const Users = lazy(() => import('@features/users'));
const MenuManager = lazy(() => import('@features/portal-menu'));
const PageEditor = lazy(() => import('@features/portal-pages'));
const Media = lazy(() => import('@features/media'));
const RevisionQueue = lazy(() => import('@features/revision'));
const LayerEditPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.LayerEditPage })));
const InitialLayerOrderPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.InitialLayerOrderPage })));
const EventosListPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventosListPage })));
const EventoEditPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventoEditPage })));
const HomePage = lazy(() => import('@features/mapalab-home').then((m) => ({ default: m.HomePage })));
const FormulariosPage = lazy(() => import('@features/sieej-formularios'));
const Inicio = lazy(() => import('@features/inicio'));
const Perfil = lazy(() => import('@features/perfil'));

const PageFallback = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
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
                    { index: true, element: <Navigate to="inicio" replace /> },
                    {
                        path: 'inicio',
                        element: withSuspense(<Inicio />)
                    },
                    {
                        path: 'perfil',
                        element: withSuspense(<Perfil />)
                    },
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
                                <LayerEditPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/layers/:id/edit',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <LayerEditPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/initial-order',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <InitialLayerOrderPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/eventos',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <EventosListPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/eventos/nuevo',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <EventoEditPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/eventos/:id/edit',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <EventoEditPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/home',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <HomePage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'sieej/formularios',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <FormulariosPage />
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
], { basename: '/mariachi' });

createRoot(document.getElementById('root')).render(
    <AuthProvider>
        <RouterProvider router={router} />
    </AuthProvider>
);
