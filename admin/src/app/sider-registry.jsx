import {
    ApartmentOutlined,
    AppstoreOutlined,
    BarChartOutlined,
    BookOutlined,
    BranchesOutlined,
    CalendarOutlined,
    CodeOutlined,
    DashboardOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    FormOutlined,
    GlobalOutlined,
    HomeOutlined,
    InboxOutlined,
    KeyOutlined,
    MenuOutlined,
    OrderedListOutlined,
    PartitionOutlined,
    PieChartOutlined,
    ProjectOutlined,
    TagsOutlined,
    TeamOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import ColibriIcon from '@shared/components/ColibriIcon';

export const PROJECT_REGISTRY = {
    portal: {
        label: 'Portalito',
        icon: <GlobalOutlined />,
        disabled: true,
        items: [
            { key: '/menu', path: '/menu', label: 'Menú', icon: <MenuOutlined /> },
            { key: '/pages', path: '/pages', label: 'Páginas', icon: <FileTextOutlined /> },
        ],
    },
    tablerillos: {
        label: 'Tablerillos',
        icon: <DashboardOutlined />,
        disabled: true,
        items: [
            { key: '/tablerillos', path: '/tablerillos', label: 'Tableros', icon: <DashboardOutlined /> },
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
            { key: '/mapalab/initial-order', path: '/mapalab/initial-order', label: 'Capas iniciales', icon: <OrderedListOutlined /> },
            { key: '/mapalab/eventos', path: '/mapalab/eventos', label: 'Eventos', icon: <CalendarOutlined /> },
            { key: '/mapalab/home', path: '/mapalab/home', label: 'Inicio', icon: <HomeOutlined /> },
            {
                key: '/mapalab/simbolos', path: '/mapalab/simbolos', label: 'Símbolos',
                icon: <AppstoreOutlined />, allowedGlobalRoles: ['tetlamamakani'], showBetaBadge: true,
            },
            {
                key: '/mapalab/recursos-geoserver', path: '/mapalab/recursos-geoserver', label: 'Recursos GeoServer',
                icon: <FileTextOutlined />, showBetaBadge: true,
            },
            {
                key: '/mapalab/api-keys', path: '/mapalab/api-keys', label: 'API Keys',
                icon: <KeyOutlined />, allowedGlobalRoles: ['tetlamamakani'], showBetaBadge: true,
            },
            {
                key: '/mapalab/stats', path: '/mapalab/stats', label: 'Estadísticas',
                icon: <BarChartOutlined />,
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
            {
                key: '/colibri/integracion', path: '/colibri/integracion', label: 'Integración',
                icon: <CodeOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
        ],
    },
};

export const FOOTER_ITEMS = [
    {
        key: '/documentacion',
        path: '/documentacion',
        label: 'Documentación',
        icon: <BookOutlined />,
        allowedGlobalRoles: ['tetlamamakani', 'editora'],
    },
];
