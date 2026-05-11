import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createRoot } from 'react-dom/client'
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
import { buildMapalabApiKeysRoutes } from '@features/mapalab-api-keys/routes';

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
const Actividad = lazy(() => import('@features/actividad'));
const MenuManager = lazy(() => import('@features/portal-menu'));
const PageEditor = lazy(() => import('@features/portal-pages'));
const Media = lazy(() => import('@features/media'));
const RevisionQueue = lazy(() => import('@features/revision'));
const ReportesListPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.ReportesListPage })));
const ColibriResumenPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.ResumenPage })));
const ColibriTiposPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.TiposPage })));
const ColibriDireccionesPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.DireccionesPage })));
const ColibriSourceAppsPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.SourceAppsPage })));
const ColibriRoutesPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.RoutesPage })));
const ColibriIntegracionPage = lazy(() => import('@features/colibri').then((m) => ({ default: m.IntegracionPage })));
const LayerEditPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.LayerEditPage })));
const InitialLayerOrderPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.InitialLayerOrderPage })));
const EventosListPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventosListPage })));
const EventoEditPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventoEditPage })));
const HomePage = lazy(() => import('@features/mapalab-home').then((m) => ({ default: m.HomePage })));
const FormulariosListPage = lazy(() => import('@features/sieej-formularios').then((m) => ({ default: m.FormulariosListPage })));
const FormularioEditorPage = lazy(() => import('@features/sieej-formularios').then((m) => ({ default: m.FormularioEditorPage })));
const GruposPage = lazy(() => import('@features/sieej-formularios').then((m) => ({ default: m.GruposPage })));
const Inicio = lazy(() => import('@features/inicio'));
const Perfil = lazy(() => import('@features/perfil'));

const PageFallback = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
    </div>
);

const withSuspense = (node) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

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
                        path: 'actividad',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <Actividad />
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
                        path: 'colibri',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <ColibriResumenPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'colibri/reportes',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <ReportesListPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'colibri/tipos',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <ColibriTiposPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'colibri/direcciones',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <ColibriDireccionesPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'colibri/source-apps',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <ColibriSourceAppsPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'colibri/routes',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <ColibriRoutesPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'colibri/integracion',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <ColibriIntegracionPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'reportes',
                        element: <Navigate to="/colibri/reportes" replace />
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
                    ...buildMapalabApiKeysRoutes(withSuspense),
                    {
                        path: 'sieej/formularios',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <FormulariosListPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'sieej/formularios/:id',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <FormularioEditorPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'sieej/grupos',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <GruposPage />
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
// Wed Apr 29 14:43:53 CST 2026
