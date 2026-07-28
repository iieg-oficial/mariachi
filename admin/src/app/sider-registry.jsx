import {
    ApartmentOutlined,
    AppstoreOutlined,
    AuditOutlined,
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
} from '@ant-design/icons';
import ColibriIcon from '@shared/components/ColibriIcon';

export const PROJECT_REGISTRY = {
    sextante: {
        label: 'Sextante',
        icon: <CompassOutlined />,
        accessSlug: 'mapalab',
        showBetaBadge: true,
        items: [
            {
                key: '/sextante/workspaces', path: '/sextante/workspaces', label: 'Workspaces',
                icon: <DeploymentUnitOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
            { key: '/sextante/capas', path: '/sextante/capas', label: 'Explorador de capas', icon: <TableOutlined /> },
            { key: '/sextante/estilos', path: '/sextante/estilos', label: 'Estilos', icon: <BgColorsOutlined /> },
            { key: '/sextante/recursos', path: '/sextante/recursos', label: 'Recursos', icon: <FileTextOutlined /> },
            { key: '/sextante/tipografias', path: '/sextante/tipografias', label: 'Tipografías', icon: <FontSizeOutlined /> },
            {
                key: '/sextante/simbolos', path: '/sextante/simbolos', label: 'Símbolos',
                icon: <AppstoreOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
        ],
    },
    mapalab: {
        label: 'MapaLab',
        icon: <EnvironmentOutlined />,
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
                icon: <EditOutlined />, allowedGlobalRoles: ['tetlamamakani'], showBetaBadge: true,
            },
            { key: '/mapalab/initial-order', path: '/mapalab/initial-order', label: 'Capas iniciales', icon: <OrderedListOutlined /> },
            { key: '/mapalab/eventos', path: '/mapalab/eventos', label: 'Eventos', icon: <CalendarOutlined /> },
            { key: '/mapalab/home', path: '/mapalab/home', label: 'Inicio', icon: <HomeOutlined /> },
            {
                key: '/mapalab/api-keys', path: '/mapalab/api-keys', label: 'API Keys',
                icon: <KeyOutlined />, allowedGlobalRoles: ['tetlamamakani'], showBetaBadge: true,
            },

        ],
    },
    sieej: {
        label: 'SIEEJ',
        icon: <ProjectOutlined />,
        items: [
            { key: '/sieej/formularios', path: '/sieej/formularios', label: 'Formularios', icon: <FormOutlined /> },
            { key: '/sieej/grupos', path: '/sieej/grupos', label: 'Grupos', icon: <TeamOutlined /> },
            { key: '/sieej/catalogos', path: '/sieej/catalogos', label: 'Catálogos', icon: <UnorderedListOutlined /> },
        ],
    },
    colibri: {
        label: 'Colibri',
        icon: <ColibriIcon size={14} />,
        allowedGlobalRoles: ['tetlamamakani', 'editora'],
        showBetaBadge: true,
        items: [
            { key: '/colibri', path: '/colibri', label: 'Resumen', icon: <PieChartOutlined /> },
            {
                key: '/colibri/reportes', path: '/colibri/reportes', label: 'Reportes',
                icon: <InboxOutlined />, showReporteBadge: true,
            },
            {
                key: '/colibri/tipos', path: '/colibri/tipos', label: 'Tipos',
                icon: <TagsOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
            {
                key: '/colibri/direcciones', path: '/colibri/direcciones', label: 'Direcciones',
                icon: <ApartmentOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
            {
                key: '/colibri/source-apps', path: '/colibri/source-apps', label: 'Source apps',
                icon: <AppstoreOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
            {
                key: '/colibri/routes', path: '/colibri/routes', label: 'Routes',
                icon: <BranchesOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
        ],
    },
    identidad: {
        label: 'Identidad',
        icon: <BgColorsOutlined />,
        allowedGlobalRoles: ['tetlamamakani'],
        showBetaBadge: true,
        items: [
            {
                key: '/identidad', path: '/identidad', label: 'Marcas y tokens',
                icon: <BgColorsOutlined />, allowedGlobalRoles: ['tetlamamakani'],
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
        allowedGlobalRoles: ['tetlamamakani', 'editora'],
    },
    {
        key: '/revision',
        path: '/revision',
        label: 'Revisiones',
        icon: <AuditOutlined />,
        allowedGlobalRoles: ['tetlamamakani'],
        showBadge: true,
    },
];
