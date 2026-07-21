import {
    ClusterOutlined,
    DashboardOutlined,
    FileImageOutlined,
    LockOutlined,
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
        key: '/monitoreo',
        path: '/monitoreo',
        label: 'Huachicol',
        icon: <ClusterOutlined />,
        allowedGlobalRoles: ['tetlamamakani'],
    },
    {
        key: '/acervo',
        path: '/acervo',
        label: 'Acervo',
        icon: <FileImageOutlined />,
        allowedGlobalRoles: ['tetlamamakani', 'editora'],
    },
];

export function buildSiderItems({ user, onNavigate, extras = {} }) {
    const role = user?.role;
    if (!role) return [];

    const items = [];

    for (const item of MAIN_ITEMS) {
        items.push(buildLeafItem(item, role, onNavigate, extras));
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
                    if (item.showBetaBadge) {
                        label = withBetaBadge(label);
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
    for (const [slug, project] of Object.entries(PROJECT_REGISTRY)) {
        if (project.items.some((item) => pathname.startsWith(item.path))) {
            return `project-${slug}`;
        }
    }
    return null;
}

const ALL_NAV_ITEMS = [
    ...MAIN_ITEMS,
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
