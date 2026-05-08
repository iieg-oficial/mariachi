import {
    TeamOutlined,
    FileImageOutlined,
    AuditOutlined,
    MenuOutlined,
    FileTextOutlined,
    PartitionOutlined,
    GlobalOutlined,
    EnvironmentOutlined,
    ProjectOutlined,
    FormOutlined,
    OrderedListOutlined,
    CalendarOutlined,
    HomeOutlined,
    DashboardOutlined,
    PieChartOutlined,
    InboxOutlined,
    TagsOutlined,
    ApartmentOutlined,
    AppstoreOutlined,
    BranchesOutlined,
    CodeOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import ColibriIcon from '@shared/components/ColibriIcon';

const ROLE_LABELS = {
    tetlamamakani: 'Administradora',
    editora: 'Editora',
    externo: 'Externo',
};

const formatRolesList = (roles) => {
    if (!roles || roles.length === 0) return 'Acceso restringido';
    return roles.map((r) => ROLE_LABELS[r] || r).join(' o ');
};

const renderDisabledLabel = (label, requiredRoles) => {
    const tooltip = requiredRoles && requiredRoles.length > 0
        ? `Solo ${formatRolesList(requiredRoles)}`
        : 'Acceso restringido';
    return (
        <Tooltip title={tooltip} placement="right">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.55 }}>
                <span>{label}</span>
                <LockOutlined style={{ fontSize: 11 }} />
            </span>
        </Tooltip>
    );
};

export const PLATFORM_ITEMS = [
    {
        key: '/users',
        path: '/users',
        label: 'Usuarios',
        icon: <TeamOutlined />,
        allowedGlobalRoles: ['tetlamamakani'],
    },
    {
        key: '/media',
        path: '/media',
        label: 'Media',
        icon: <FileImageOutlined />,
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
    mapalab: {
        label: 'MapaLab',
        icon: <EnvironmentOutlined />,
        items: [
            {
                key: '/mapalab/layers',
                path: '/mapalab/layers',
                label: 'Capas',
                icon: <PartitionOutlined />,
            },
            {
                key: '/mapalab/initial-order',
                path: '/mapalab/initial-order',
                label: 'Capas iniciales',
                icon: <OrderedListOutlined />,
            },
            {
                key: '/mapalab/eventos',
                path: '/mapalab/eventos',
                label: 'Eventos',
                icon: <CalendarOutlined />,
            },
            {
                key: '/mapalab/home',
                path: '/mapalab/home',
                label: 'Inicio',
                icon: <HomeOutlined />,
            },
        ],
    },
    sieej: {
        label: 'SIEEJ',
        icon: <ProjectOutlined />,
        items: [
            {
                key: '/sieej/formularios',
                path: '/sieej/formularios',
                label: 'Formularios',
                icon: <FormOutlined />,
            },
            {
                key: '/sieej/grupos',
                path: '/sieej/grupos',
                label: 'Grupos',
                icon: <TeamOutlined />,
            },
        ],
    },
    colibri: {
        label: 'Colibri',
        icon: <ColibriIcon size={14} />,
        allowedGlobalRoles: ['tetlamamakani', 'editora'],
        items: [
            {
                key: '/colibri',
                path: '/colibri',
                label: 'Resumen',
                icon: <PieChartOutlined />,
            },
            {
                key: '/colibri/reportes',
                path: '/colibri/reportes',
                label: 'Reportes',
                icon: <InboxOutlined />,
                showReporteBadge: true,
            },
            {
                key: '/colibri/tipos',
                path: '/colibri/tipos',
                label: 'Tipos',
                icon: <TagsOutlined />,
                allowedGlobalRoles: ['tetlamamakani'],
            },
            {
                key: '/colibri/direcciones',
                path: '/colibri/direcciones',
                label: 'Direcciones',
                icon: <ApartmentOutlined />,
                allowedGlobalRoles: ['tetlamamakani'],
            },
            {
                key: '/colibri/source-apps',
                path: '/colibri/source-apps',
                label: 'Source apps',
                icon: <AppstoreOutlined />,
                allowedGlobalRoles: ['tetlamamakani'],
            },
            {
                key: '/colibri/routes',
                path: '/colibri/routes',
                label: 'Routes',
                icon: <BranchesOutlined />,
                allowedGlobalRoles: ['tetlamamakani'],
            },
            {
                key: '/colibri/integracion',
                path: '/colibri/integracion',
                label: 'Integración',
                icon: <CodeOutlined />,
                allowedGlobalRoles: ['tetlamamakani'],
            },
        ],
    },
};

export function buildSiderItems({ user, onNavigate, extras = {} }) {
    const role = user?.role;
    if (!role) return [];

    const items = [];

    items.push({
        key: '/inicio',
        icon: <DashboardOutlined />,
        label: 'Inicio',
        onClick: () => onNavigate('/inicio'),
    });

    const renderBadgeLabel = (label, count) => (
        <span>
            {label}{' '}
            <span
                style={{
                    marginLeft: 6,
                    background: '#ff4d4f',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '0 6px',
                    fontSize: 11,
                }}
            >
                {count}
            </span>
        </span>
    );

    const platformChildren = PLATFORM_ITEMS.map((item) => {
        const allowed = item.allowedGlobalRoles.includes(role);
        const itemDisabled = item.disabled || !allowed;
        let label = item.label;
        if (allowed) {
            if (item.showBadge && extras.pendingCount > 0) {
                label = renderBadgeLabel(item.label, extras.pendingCount);
            } else if (item.showReporteBadge && extras.reportesPendingCount > 0) {
                label = renderBadgeLabel(item.label, extras.reportesPendingCount);
            }
        } else {
            label = renderDisabledLabel(item.label, item.allowedGlobalRoles);
        }
        return {
            key: item.key,
            icon: item.icon,
            disabled: itemDisabled,
            label,
            onClick: itemDisabled ? undefined : () => onNavigate(item.path),
        };
    });

    if (platformChildren.length > 0) {
        items.push({
            key: 'platform',
            icon: <ProjectOutlined />,
            label: 'Plataforma',
            children: platformChildren,
        });
    }

    const isAdmin = role === 'tetlamamakani';
    const userProjectSlugs = (user?.projects || []).map((p) => p.slug);

    for (const [slug, project] of Object.entries(PROJECT_REGISTRY)) {
        if (project.items.length === 0) continue;
        const grantedByRole = project.allowedGlobalRoles?.includes(role);
        const grantedByMembership = userProjectSlugs.includes(slug);
        const projectAccessible = isAdmin || grantedByRole || grantedByMembership;
        const projectDisabled = project.disabled || !projectAccessible;
        const projectLabel = projectAccessible
            ? project.label
            : renderDisabledLabel(project.label, project.allowedGlobalRoles);

        items.push({
            key: `project-${slug}`,
            icon: project.icon,
            label: projectLabel,
            disabled: projectDisabled,
            children: project.items.map((item) => {
                const itemAllowedByRole = !item.allowedGlobalRoles || item.allowedGlobalRoles.includes(role);
                const itemAccessible = projectAccessible && itemAllowedByRole;
                const itemDisabled = projectDisabled || item.disabled || !itemAccessible;
                let label = item.label;
                if (itemAccessible) {
                    if (item.showBadge && extras.pendingCount > 0) {
                        label = renderBadgeLabel(item.label, extras.pendingCount);
                    } else if (item.showReporteBadge && extras.reportesPendingCount > 0) {
                        label = renderBadgeLabel(item.label, extras.reportesPendingCount);
                    }
                } else {
                    label = renderDisabledLabel(item.label, item.allowedGlobalRoles || project.allowedGlobalRoles);
                }
                return {
                    key: item.key,
                    icon: item.icon,
                    label,
                    disabled: itemDisabled,
                    onClick: itemDisabled ? undefined : () => onNavigate(item.path),
                };
            }),
        });
    }

    return items;
}

export function defaultOpenKeyForPath(pathname) {
    for (const [slug, project] of Object.entries(PROJECT_REGISTRY)) {
        if (project.items.some((item) => pathname.startsWith(item.path))) {
            return `project-${slug}`;
        }
    }
    return 'platform';
}
