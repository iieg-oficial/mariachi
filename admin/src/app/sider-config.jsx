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
} from '@ant-design/icons';

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
        ],
    },
};

export function buildSiderItems({ user, onNavigate, extras = {} }) {
    const role = user?.role;
    if (!role) return [];

    const items = [];

    const platformChildren = PLATFORM_ITEMS
        .filter((item) => item.allowedGlobalRoles.includes(role))
        .map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.showBadge && extras.pendingCount > 0 ? (
                <span>
                    {item.label}{' '}
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
                        {extras.pendingCount}
                    </span>
                </span>
            ) : item.label,
            onClick: () => onNavigate(item.path),
        }));

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
        if (!isAdmin && !userProjectSlugs.includes(slug)) continue;

        items.push({
            key: `project-${slug}`,
            icon: project.icon,
            label: project.label,
            children: project.items.map((item) => ({
                key: item.key,
                icon: item.icon,
                label: item.label,
                onClick: () => onNavigate(item.path),
            })),
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
