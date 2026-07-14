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
import { buildColibriRoutes } from '@features/colibri/routes';

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
const Acervo = lazy(() => import('@features/acervo'));
const RevisionQueue = lazy(() => import('@features/revision'));
const LayerEditPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.LayerEditPage })));
const InitialLayerOrderPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.InitialLayerOrderPage })));
const BulkIngestPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.BulkIngestPage })));
const EventosListPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventosListPage })));
const EventoEditPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventoEditPage })));
const HomePage = lazy(() => import('@features/mapalab-home').then((m) => ({ default: m.HomePage })));
const SymbolsPage = lazy(() => import('@features/mapalab-symbols').then((m) => ({ default: m.SymbolsPage })));
const GeoserverFilesPage = lazy(() => import('@features/mapalab-geoserver-files').then((m) => ({ default: m.GeoserverFilesPage })));
const MapalabStatsPage = lazy(() => import('@features/mapalab-stats').then((m) => ({ default: m.MapalabStatsPage })));
const DocumentacionPage = lazy(() => import('@features/documentacion').then((m) => ({ default: m.DocumentacionPage })));
const FormulariosListPage = lazy(() => import('@features/sieej-formularios').then((m) => ({ default: m.FormulariosListPage })));
const FormularioEditorPage = lazy(() => import('@features/sieej-formularios').then((m) => ({ default: m.FormularioEditorPage })));
const GruposPage = lazy(() => import('@features/sieej-formularios').then((m) => ({ default: m.GruposPage })));
const CatalogosPage = lazy(() => import('@features/sieej-formularios').then((m) => ({ default: m.CatalogosPage })));
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
        element: <MainProvider />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: '/login', element: <Login />, errorElement: <ErrorBoundary /> },
            {
                element: (<ProtectedRoute><MainLayout /></ProtectedRoute>),
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
                    ...buildColibriRoutes(withSuspense),
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
                        path: 'acervo',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <Acervo />
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
                        path: 'mapalab/layers/ingesta-masiva',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <BulkIngestPage />
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
                        path: 'mapalab/simbolos',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani']}>
                                <SymbolsPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/recursos-geoserver',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <GeoserverFilesPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/stats',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <MapalabStatsPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'mapalab/stats/sesiones',
                        element: <Navigate to="/mapalab/stats?tab=sesiones" replace />
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
                        path: 'sieej/formularios/:slug',
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
                        path: 'sieej/catalogos',
                        element: withSuspense(
                            <RoleProtectedRoute allowedRoles={['tetlamamakani', 'editora']}>
                                <CatalogosPage />
                            </RoleProtectedRoute>
                        )
                    },
                    {
                        path: 'documentacion',
                        element: withSuspense(<DocumentacionPage />)
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
