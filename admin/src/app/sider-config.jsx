import {
    BarChartOutlined,
    CloudServerOutlined,
    ClusterOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    FileImageOutlined,
    HistoryOutlined,
    HomeOutlined,
    LockOutlined,
    PictureOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import StatusBadge from '@shared/components/StatusBadge';
import { FOOTER_RAIL_ITEMS, PROJECT_REGISTRY } from '@app/sider-registry';

export { PROJECT_REGISTRY };

const grants = (permissions, can) => !permissions || permissions.length === 0
    || permissions.some((permission) => can(permission));

const renderDisabledLabel = (label, requiredPermissions) => {
    const tooltip = requiredPermissions && requiredPermissions.length > 0
        ? `Requiere ${requiredPermissions.join(' o ')}`
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

const withBetaBadge = (label, variantes = ['beta']) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        {variantes.map((variante) => <StatusBadge key={variante} variant={variante} size="sm" />)}
    </span>
);

const variantePara = (origen) => {
    const declaradas = origen.badgeVariant || (origen.showBetaBadge ? 'beta' : null);
    if (!declaradas) return null;
    return Array.isArray(declaradas) ? declaradas : [declaradas];
};

const renderBadgeLabel = (label, count) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        <StatusBadge text={String(count)} color="#fff" bg="#ff4d4f" size="sm" />
    </span>
);

function buildLeafItem(item, can, onNavigate, extras) {
    const allowed = grants(item.permissions, can);
    const itemDisabled = item.disabled || !allowed;
    let label = item.label;
    if (allowed) {
        if (item.showBadge && extras.pendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.pendingCount);
        } else if (item.showReporteBadge && extras.reportesPendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.reportesPendingCount);
        }
        const variante = variantePara(item);
        if (variante) {
            label = withBetaBadge(label, variante);
        }
    } else {
        label = renderDisabledLabel(item.label, item.permissions);
    }
    return {
        key: item.key,
        icon: item.icon,
        disabled: itemDisabled,
        label,
        onClick: itemDisabled ? undefined : () => onNavigate(item.path),
    };
}

function buildChildItem(item, parentAccessible, parentDisabled, can, onNavigate, extras, parentPermissions) {
    const itemAccessible = parentAccessible && grants(item.permissions, can);
    const itemDisabled = parentDisabled || item.disabled || !itemAccessible;
    let label = item.label;
    if (itemAccessible) {
        if (item.showBadge && extras.pendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.pendingCount);
        } else if (item.showReporteBadge && extras.reportesPendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.reportesPendingCount);
        }
        const variante = variantePara(item);
        if (variante) {
            label = withBetaBadge(label, variante);
        }
    } else {
        label = renderDisabledLabel(item.label, item.permissions || parentPermissions);
    }
    return {
        key: item.key,
        icon: item.icon,
        label,
        disabled: itemDisabled,
        onClick: itemDisabled ? undefined : () => onNavigate(item.path),
    };
}

function buildParentItem(item, can, onNavigate, extras) {
    const allowed = grants(item.permissions, can);
    const parentDisabled = item.disabled || !allowed;
    const label = allowed
        ? (variantePara(item) ? withBetaBadge(item.label, variantePara(item)) : item.label)
        : renderDisabledLabel(item.label, item.permissions);
    return {
        key: item.key,
        icon: item.icon,
        label,
        disabled: parentDisabled,
        children: item.children.map((child) =>
            buildChildItem(child, allowed, parentDisabled, can, onNavigate, extras, item.permissions)),
    };
}

export const MAIN_ITEMS = [
    {
        key: '/inicio',
        path: '/inicio',
        label: 'Inicio',
        icon: <HomeOutlined />,
    },
    {
        key: '/users',
        path: '/users',
        label: 'Usuarios',
        icon: <TeamOutlined />,
        permissions: ['mariachi.usuarios.view'],
    },
    {
        key: 'group-acervo',
        label: 'Acervo',
        icon: <FileImageOutlined />,
        permissions: ['mariachi.acervo.view'],
        children: [
            { key: '/acervo', path: '/acervo', label: 'Media', icon: <PictureOutlined /> },
            {
                key: '/acervo/buckets', path: '/acervo/buckets', label: 'Buckets',
                icon: <DatabaseOutlined />, permissions: ['mariachi.acervo.manage'],
            },
        ],
    },
    {
        key: 'group-huachicol',
        label: 'Huachicol',
        icon: <ClusterOutlined />,
        permissions: ['mariachi.actividad.view'],
        children: [
            {
                key: '/huachicol/observabilidad', path: '/huachicol/observabilidad',
                label: 'Observabilidad', icon: <DashboardOutlined />,
            },
            {
                key: '/huachicol/servidores', path: '/huachicol/servidores',
                label: 'Servidores', icon: <CloudServerOutlined />,
            },
            {
                key: '/huachicol/telemetria', path: '/huachicol/telemetria',
                label: 'Telemetría', icon: <BarChartOutlined />,
            },
            {
                key: '/huachicol/actividad', path: '/huachicol/actividad',
                label: 'Actividad', icon: <HistoryOutlined />,
            },
        ],
    },
];

export function buildSiderItems({ user, can, onNavigate, extras = {} }) {
    if (!user) return [];

    const items = [];

    for (const item of MAIN_ITEMS) {
        if (item.children) {
            items.push(buildParentItem(item, can, onNavigate, extras));
        } else {
            items.push(buildLeafItem(item, can, onNavigate, extras));
        }
    }

    for (const [slug, project] of Object.entries(PROJECT_REGISTRY)) {
        if (project.items.length === 0) continue;
        const projectAccessible = grants(project.permissions, can);
        const projectDisabled = project.disabled || !projectAccessible;
        const projectLabel = projectAccessible
            ? (variantePara(project) ? withBetaBadge(project.label, variantePara(project)) : project.label)
            : renderDisabledLabel(project.label, project.permissions);

        items.push({
            key: `project-${slug}`,
            icon: project.icon,
            label: projectLabel,
            disabled: projectDisabled,
            children: project.items.map((item) =>
                buildChildItem(
                    item, projectAccessible, projectDisabled, can, onNavigate, extras,
                    project.permissions,
                )),
        });
    }

    return items;
}

export function buildSiderFooterRail({ user, can, onNavigate, extras = {} }) {
    if (!user) return [];
    const items = [];
    for (const item of FOOTER_RAIL_ITEMS) {
        if (!grants(item.permissions, can)) continue;
        items.push({
            key: item.key,
            path: item.path,
            label: item.label,
            icon: item.icon,
            badgeCount: item.showBadge ? (extras.pendingCount || 0) : 0,
            onClick: () => onNavigate(item.path),
        });
    }
    return items;
}

export function defaultOpenKeyForPath(pathname) {
    for (const item of MAIN_ITEMS) {
        if (item.children && item.children.some((child) => pathname.startsWith(child.path))) {
            return item.key;
        }
    }
    for (const [slug, project] of Object.entries(PROJECT_REGISTRY)) {
        if (project.items.some((item) => pathname.startsWith(item.path))) {
            return `project-${slug}`;
        }
    }
    return null;
}

const ALL_NAV_ITEMS = [
    ...MAIN_ITEMS.flatMap((item) => (item.children ? item.children : [item])),
    ...Object.values(PROJECT_REGISTRY).flatMap((project) => project.items),
    ...FOOTER_RAIL_ITEMS,
];

export function selectedKeyForPath(pathname) {
    let best = null;
    for (const item of ALL_NAV_ITEMS) {
        if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
            if (!best || item.path.length > best.path.length) best = item;
        }
    }
    return best ? best.key : pathname;
}
