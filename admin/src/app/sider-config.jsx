import {
    BarChartOutlined,
    ClusterOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    FileImageOutlined,
    HistoryOutlined,
    LockOutlined,
    PictureOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import StatusBadge from '@shared/components/StatusBadge';
import { FOOTER_RAIL_ITEMS, PROJECT_REGISTRY } from '@app/sider-registry';

export { PROJECT_REGISTRY };

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

const withBetaBadge = (label) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        <StatusBadge variant="beta" size="sm" />
    </span>
);

const renderBadgeLabel = (label, count) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        <StatusBadge text={String(count)} color="#fff" bg="#ff4d4f" size="sm" />
    </span>
);

function buildLeafItem(item, role, onNavigate, extras) {
    const allowed = !item.allowedGlobalRoles || item.allowedGlobalRoles.includes(role);
    const itemDisabled = item.disabled || !allowed;
    let label = item.label;
    if (allowed) {
        if (item.showBadge && extras.pendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.pendingCount);
        } else if (item.showReporteBadge && extras.reportesPendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.reportesPendingCount);
        }
        if (item.showBetaBadge) {
            label = withBetaBadge(label);
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
}

function buildChildItem(item, parentAccessible, parentDisabled, role, onNavigate, extras, parentRoles) {
    const itemAllowedByRole = !item.allowedGlobalRoles || item.allowedGlobalRoles.includes(role);
    const itemAccessible = parentAccessible && itemAllowedByRole;
    const itemDisabled = parentDisabled || item.disabled || !itemAccessible;
    let label = item.label;
    if (itemAccessible) {
        if (item.showBadge && extras.pendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.pendingCount);
        } else if (item.showReporteBadge && extras.reportesPendingCount > 0) {
            label = renderBadgeLabel(item.label, extras.reportesPendingCount);
        }
        if (item.showBetaBadge) {
            label = withBetaBadge(label);
        }
    } else {
        label = renderDisabledLabel(item.label, item.allowedGlobalRoles || parentRoles);
    }
    return {
        key: item.key,
        icon: item.icon,
        label,
        disabled: itemDisabled,
        onClick: itemDisabled ? undefined : () => onNavigate(item.path),
    };
}

function buildParentItem(item, role, onNavigate, extras) {
    const allowed = !item.allowedGlobalRoles || item.allowedGlobalRoles.includes(role);
    const parentDisabled = item.disabled || !allowed;
    const label = allowed
        ? (item.showBetaBadge ? withBetaBadge(item.label) : item.label)
        : renderDisabledLabel(item.label, item.allowedGlobalRoles);
    return {
        key: item.key,
        icon: item.icon,
        label,
        disabled: parentDisabled,
        children: item.children.map((child) =>
            buildChildItem(child, allowed, parentDisabled, role, onNavigate, extras, item.allowedGlobalRoles)),
    };
}

export const MAIN_ITEMS = [
    {
        key: '/inicio',
        path: '/inicio',
        label: 'Inicio',
        icon: <DashboardOutlined />,
    },
    {
        key: '/users',
        path: '/users',
        label: 'Usuarios',
        icon: <TeamOutlined />,
        allowedGlobalRoles: ['tetlamamakani'],
    },
    {
        key: 'group-huachicol',
        label: 'Huachicol',
        icon: <ClusterOutlined />,
        allowedGlobalRoles: ['tetlamamakani'],
        children: [
            {
                key: '/huachicol/observabilidad', path: '/huachicol/observabilidad',
                label: 'Observabilidad', icon: <DashboardOutlined />,
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
    {
        key: 'group-acervo',
        label: 'Acervo',
        icon: <FileImageOutlined />,
        allowedGlobalRoles: ['tetlamamakani', 'editora'],
        children: [
            { key: '/acervo', path: '/acervo', label: 'Media', icon: <PictureOutlined /> },
            {
                key: '/acervo/buckets', path: '/acervo/buckets', label: 'Buckets',
                icon: <DatabaseOutlined />, allowedGlobalRoles: ['tetlamamakani'],
            },
        ],
    },
];

export function buildSiderItems({ user, onNavigate, extras = {} }) {
    const role = user?.role;
    if (!role) return [];

    const items = [];

    for (const item of MAIN_ITEMS) {
        if (item.children) {
            items.push(buildParentItem(item, role, onNavigate, extras));
        } else {
            items.push(buildLeafItem(item, role, onNavigate, extras));
        }
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
            ? (project.showBetaBadge ? withBetaBadge(project.label) : project.label)
            : renderDisabledLabel(project.label, project.allowedGlobalRoles);

        items.push({
            key: `project-${slug}`,
            icon: project.icon,
            label: projectLabel,
            disabled: projectDisabled,
            children: project.items.map((item) =>
                buildChildItem(
                    item, projectAccessible, projectDisabled, role, onNavigate, extras,
                    project.allowedGlobalRoles,
                )),
        });
    }

    return items;
}

export function buildSiderFooterRail({ user, onNavigate, extras = {} }) {
    const role = user?.role;
    if (!role) return [];
    const items = [];
    for (const item of FOOTER_RAIL_ITEMS) {
        const allowed = !item.allowedGlobalRoles || item.allowedGlobalRoles.includes(role);
        if (!allowed) continue;
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
