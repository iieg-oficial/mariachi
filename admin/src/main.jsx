import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createRoot } from 'react-dom/client'
import { Result, Spin } from 'antd';
import './index.css'
import { AuthProvider } from '@shared/contexts/AuthContext';
import MainProvider from '@app/providers/MainProvider';
import ProtectedRoute from '@app/guards/ProtectedRoute';
import PermissionRoute from '@app/guards/PermissionRoute';
import ErrorBoundary from '@app/guards/ErrorBoundary';
import MainLayout from '@app/MainLayout';
import FullscreenLayout from '@app/FullscreenLayout';
import { Navigate } from 'react-router';
import Login from '@features/auth/pages/LoginPage';
import { buildMapalabApiKeysRoutes } from '@features/mapalab-api-keys/routes';
import { buildMapalabAccesoRoutes } from '@features/mapalab-acceso/routes';
import { buildColibriRoutes } from '@features/colibri/routes';
import { buildHuachicolRoutes } from '@features/telemetria/routes';
import { buildMelRoutes } from '@features/mel/routes';
import { buildSieejDocumentacionRoutes } from '@features/sieej-documentacion/routes';
import { buildSextanteRoutes } from '@features/sextante/routes';
import { buildFramesRoutes, buildFramesFullscreenRoutes } from '@features/frames/routes';
import { buildIntranetRoutes } from '@features/intranet/routes';
import { buildVineFullscreenRoutes, buildVineRoutes } from '@features/vine/routes';

const Users = lazy(() => import('@features/users'));
const MenuManager = lazy(() => import('@features/portal-menu'));
const PageEditor = lazy(() => import('@features/portal-pages'));
const Acervo = lazy(() => import('@features/acervo'));
const AcervoBuckets = lazy(() => import('@features/acervo').then((m) => ({ default: m.BucketsPage })));
const RevisionQueue = lazy(() => import('@features/revision'));
const LayerEditPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.LayerEditPage })));
const InitialLayerOrderPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.InitialLayerOrderPage })));
const BulkIngestPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.BulkIngestPage })));
const MetadataGridPage = lazy(() => import('@features/mapalab-layers').then((m) => ({ default: m.MetadataGridPage })));
const CatalogoCapasPage = lazy(() => import('@features/mapalab-catalogo').then((m) => ({ default: m.CatalogoCapasPage })));
const InfoboxPropuestasPage = lazy(() => import('@features/mapalab-infobox').then((m) => ({ default: m.InfoboxPropuestasPage })));
const EventosListPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventosListPage })));
const EventoEditPage = lazy(() => import('@features/mapalab-eventos').then((m) => ({ default: m.EventoEditPage })));
const HomePage = lazy(() => import('@features/mapalab-home').then((m) => ({ default: m.HomePage })));
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
                            <PermissionRoute anyOf={['mariachi.usuarios.view']}>
                                <Users />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'revision',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.manage']}>
                                <RevisionQueue />
                            </PermissionRoute>
                        )
                    },
                    ...buildColibriRoutes(withSuspense),
                    {
                        path: 'menu',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.portal.update']}>
                                <MenuManager />
                            </PermissionRoute>
                        )
                    },

                    {
                        path: 'pages/edit/:id',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.portal.update']}>
                                <PageEditor />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'acervo',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.acervo.view']}>
                                <Acervo />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'acervo/buckets',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.acervo.manage']}>
                                <AcervoBuckets />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/layers',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.view']}>
                                <LayerEditPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/layers/:id/edit',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.view']}>
                                <LayerEditPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/initial-order',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.manage']}>
                                <InitialLayerOrderPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/layers/ingesta-masiva',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.manage']}>
                                <BulkIngestPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/catalogo',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.view']}>
                                <CatalogoCapasPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/infobox-propuestas',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab_propuestas.approve']}>
                                <InfoboxPropuestasPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/eventos',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.view']}>
                                <EventosListPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/eventos/nuevo',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.update']}>
                                <EventoEditPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/eventos/:id/edit',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.update']}>
                                <EventoEditPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'mapalab/home',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.view']}>
                                <HomePage />
                            </PermissionRoute>
                        )
                    },
                    ...buildSextanteRoutes(withSuspense),
                    ...buildMelRoutes(withSuspense),
                    ...buildFramesRoutes(withSuspense),
                    ...buildIntranetRoutes(withSuspense),
                    ...buildVineRoutes(withSuspense),
                    ...buildHuachicolRoutes(withSuspense),
                    ...buildMapalabApiKeysRoutes(withSuspense),
                    ...buildMapalabAccesoRoutes(withSuspense),
                    ...buildSieejDocumentacionRoutes(withSuspense),
                    {
                        path: 'sieej/formularios',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.sieej_admin.view']}>
                                <FormulariosListPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'sieej/formularios/:slug',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.sieej_formularios.update']}>
                                <FormularioEditorPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'sieej/grupos',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.sieej_formularios.update']}>
                                <GruposPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'sieej/catalogos',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.sieej_formularios.update']}>
                                <CatalogosPage />
                            </PermissionRoute>
                        )
                    },
                    {
                        path: 'documentacion',
                        element: withSuspense(<DocumentacionPage />)
                    },
                    {
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
            },
            {
                element: (<ProtectedRoute><FullscreenLayout /></ProtectedRoute>),
                errorElement: <ErrorBoundary />,
                children: [
                    {
                        path: 'mapalab/layers/tabla',
                        element: withSuspense(
                            <PermissionRoute anyOf={['mariachi.mapalab.update']}>
                                <MetadataGridPage />
                            </PermissionRoute>
                        )
                    },
                    ...buildFramesFullscreenRoutes(withSuspense),
                    ...buildVineFullscreenRoutes(withSuspense),
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
