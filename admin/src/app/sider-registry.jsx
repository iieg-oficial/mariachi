import {
    ApartmentOutlined,
    AppstoreOutlined,
    AuditOutlined,
    BarChartOutlined,
    BgColorsOutlined,
    BookOutlined,
    BranchesOutlined,
    CalendarOutlined,
    CompassOutlined,
    DeploymentUnitOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    FontSizeOutlined,
    FormOutlined,
    HomeOutlined,
    InboxOutlined,
    KeyOutlined,
    EditOutlined,
    OrderedListOutlined,
    PartitionOutlined,
    PieChartOutlined,
    ProjectOutlined,
    TableOutlined,
    TagsOutlined,
    TeamOutlined,
    UnorderedListOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import ColibriIcon from '@shared/components/ColibriIcon';
import { VINE_HABILITADO } from '@features/vine/constants/flags';

export const PROJECT_REGISTRY = {
    sextante: {
        label: 'Sextante',
        icon: <CompassOutlined />,
        permissions: ['mariachi.geoserver.view'],
        showBetaBadge: true,
        items: [
            {
                key: '/sextante/workspaces', path: '/sextante/workspaces', label: 'Workspaces',
                icon: <DeploymentUnitOutlined />, permissions: ['mariachi.geoserver.manage'],
            },
            { key: '/sextante/capas', path: '/sextante/capas', label: 'Explorador de capas', icon: <TableOutlined /> },
            { key: '/sextante/estilos', path: '/sextante/estilos', label: 'Estilos', icon: <BgColorsOutlined /> },
            { key: '/sextante/recursos', path: '/sextante/recursos', label: 'Recursos', icon: <FileTextOutlined /> },
            { key: '/sextante/tipografias', path: '/sextante/tipografias', label: 'Tipografías', icon: <FontSizeOutlined /> },
            {
                key: '/sextante/simbolos', path: '/sextante/simbolos', label: 'Símbolos',
                icon: <AppstoreOutlined />, permissions: ['mariachi.mapalab.manage'],
            },
        ],
    },
    mapalab: {
        label: 'MapaLab',
        icon: <EnvironmentOutlined />,
        permissions: ['mariachi.mapalab.view'],
        items: [
            { key: '/mapalab/layers', path: '/mapalab/layers', label: 'Capas', icon: <PartitionOutlined /> },
            {
                key: '/mapalab/layers/ingesta-masiva', path: '/mapalab/layers/ingesta-masiva',
                label: 'Ingesta masiva', icon: <InboxOutlined />, showBetaBadge: true,
            },
            {
                key: '/mapalab/catalogo', path: '/mapalab/catalogo', label: 'Capas catálogo',
                icon: <UnorderedListOutlined />, showBetaBadge: true,
            },
            {
                key: '/mapalab/infobox-propuestas', path: '/mapalab/infobox-propuestas', label: 'Propuestas de tarjeta',
                icon: <EditOutlined />, permissions: ['mariachi.mapalab_propuestas.approve'], showBetaBadge: true,
            },
            { key: '/mapalab/initial-order', path: '/mapalab/initial-order', label: 'Capas iniciales', icon: <OrderedListOutlined /> },
            { key: '/mapalab/eventos', path: '/mapalab/eventos', label: 'Eventos', icon: <CalendarOutlined /> },
            { key: '/mapalab/home', path: '/mapalab/home', label: 'Inicio', icon: <HomeOutlined /> },
            {
                key: '/mapalab/api-keys', path: '/mapalab/api-keys', label: 'API Keys',
                icon: <KeyOutlined />, permissions: ['mariachi.mapalab_llaves.manage'], showBetaBadge: true,
            },

        ],
    },
    sieej: {
        label: 'SIEEJ',
        icon: <ProjectOutlined />,
        permissions: ['mariachi.sieej_admin.view'],
        items: [
            { key: '/sieej/formularios', path: '/sieej/formularios', label: 'Formularios', icon: <FormOutlined /> },
            { key: '/sieej/grupos', path: '/sieej/grupos', label: 'Grupos', icon: <TeamOutlined /> },
            { key: '/sieej/catalogos', path: '/sieej/catalogos', label: 'Catálogos', icon: <UnorderedListOutlined /> },
        ],
    },
    colibri: {
        label: 'Colibri',
        icon: <ColibriIcon size={14} />,
        permissions: ['mariachi.colibri_reportes.view', 'mariachi.colibri_config.manage'],
        showBetaBadge: true,
        items: [
            { key: '/colibri', path: '/colibri', label: 'Resumen', icon: <PieChartOutlined /> },
            {
                key: '/colibri/reportes', path: '/colibri/reportes', label: 'Reportes',
                icon: <InboxOutlined />, showReporteBadge: true,
            },
            {
                key: '/colibri/tipos', path: '/colibri/tipos', label: 'Tipos',
                icon: <TagsOutlined />, permissions: ['mariachi.colibri_config.manage'],
            },
            {
                key: '/colibri/direcciones', path: '/colibri/direcciones', label: 'Direcciones',
                icon: <ApartmentOutlined />, permissions: ['mariachi.colibri_config.manage'],
            },
            {
                key: '/colibri/source-apps', path: '/colibri/source-apps', label: 'Source apps',
                icon: <AppstoreOutlined />, permissions: ['mariachi.colibri_config.manage'],
            },
            {
                key: '/colibri/routes', path: '/colibri/routes', label: 'Routes',
                icon: <BranchesOutlined />, permissions: ['mariachi.colibri_config.manage'],
            },
        ],
    },
    identidad: {
        label: 'Identidad',
        icon: <BgColorsOutlined />,
        permissions: ['mariachi.identidad.view'],
        showBetaBadge: true,
        items: [
            {
                key: '/identidad', path: '/identidad', label: 'Marcas y tokens',
                icon: <BgColorsOutlined />, permissions: ['mariachi.identidad.update'],
            },
        ],
    },
    ...(VINE_HABILITADO ? {
        vine: {
            label: 'Vine',
            icon: <BarChartOutlined />,
            permissions: ['mariachi.vine.view'],
            badgeVariant: ['local', 'test'],
            items: [
                {
                    key: '/vine/estadisticas', path: '/vine/estadisticas', label: 'Estadísticas',
                    icon: <BarChartOutlined />,
                },
                {
                    key: '/vine/personal', path: '/vine/personal', label: 'Personal',
                    icon: <TeamOutlined />,
                },
                {
                    key: '/vine/incidencias', path: '/vine/incidencias', label: 'Vacaciones e incidencias',
                    icon: <CalendarOutlined />, permissions: ['mariachi.vine_personas.view'],
                },
                {
                    key: '/vine/catalogos', path: '/vine/catalogos', label: 'Catálogos',
                    icon: <AppstoreOutlined />,
                },
            ],
        },
    } : {}),
    wacha: {
        label: 'Wacha',
        icon: <VideoCameraOutlined />,
        permissions: ['mariachi.wacha.view'],
        badgeVariant: 'local',
        items: [
            {
                key: '/wacha/camaras', path: '/wacha/camaras', label: 'Cámaras',
                icon: <UnorderedListOutlined />,
            },
            {
                key: '/wacha/vivo', path: '/wacha/vivo', label: 'En vivo',
                icon: <VideoCameraOutlined />,
            },
        ],
    },
};

export const FOOTER_RAIL_ITEMS = [
    {
        key: '/documentacion',
        path: '/documentacion',
        label: 'Documentación',
        icon: <BookOutlined />,
        permissions: [],
    },
    {
        key: '/revision',
        path: '/revision',
        label: 'Revisiones',
        icon: <AuditOutlined />,
        permissions: ['mariachi.mapalab.manage'],
        showBadge: true,
    },
];
