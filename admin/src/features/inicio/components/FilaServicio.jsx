import { Link } from 'react-router';
import { Badge, Button, Tag, Tooltip, Typography, Grid } from 'antd';
import {
    ExclamationCircleOutlined,
    GithubOutlined,
    LinkOutlined,
    MessageOutlined,
    ProjectOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';
import BarraDisponibilidad from '@features/inicio/components/BarraDisponibilidad';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export const MAX_ENLACES = 4;
const ANCHO_ENLACE = 22;
export const ANCHO_ENLACES = MAX_ENLACES * ANCHO_ENLACE + (MAX_ENLACES - 1);

const ESTADO_BADGE = {
    ok: { status: 'success', text: 'operativa' },
    degraded: { status: 'warning', text: 'degradada' },
    down: { status: 'error', text: 'caída' },
    unreachable: { status: 'error', text: 'no responde' },
};

const IconoEnlace = ({ href, title, icon, externo = false, onClick }) => {
    const boton = (
        <Button
            type="text"
            size="small"
            icon={icon}
            aria-label={title}
            onClick={onClick}
            style={{ width: ANCHO_ENLACE, height: ANCHO_ENLACE, minWidth: ANCHO_ENLACE, color: 'rgba(0,0,0,0.45)' }}
        />
    );
    if (onClick) return <Tooltip title={title}>{boton}</Tooltip>;
    const envoltura = externo
        ? <a href={href} target="_blank" rel="noopener noreferrer">{boton}</a>
        : <Link to={href}>{boton}</Link>;
    return <Tooltip title={title}>{envoltura}</Tooltip>;
};

const enlacesDe = (plataforma, onReportar) => {
    const { label, url, repo, taiga, healthy } = plataforma;
    const items = [];
    if (url && healthy) items.push(
        <IconoEnlace key="visit" href={url} title={`Abrir ${label}`} icon={<LinkOutlined />} />
    );
    if (repo) items.push(
        <IconoEnlace key="repo" href={repo} title="Repositorio" icon={<GithubOutlined />} externo />
    );
    if (taiga) items.push(
        <IconoEnlace key="taiga" href={taiga} title="Tablero Taiga" icon={<ProjectOutlined />} externo />
    );
    if (onReportar) items.push(
        <IconoEnlace key="reportar" title={`Reportar sobre ${label}`} icon={<MessageOutlined />} onClick={onReportar} />
    );
    return items;
};

export default function FilaServicio({ plataforma, columnas, onReportar }) {
    const pantalla = useBreakpoint();
    const compacta = !pantalla.md;
    const { label, version, status, detail, sinceHuman, uptime24h, containers, tramos } = plataforma;
    const badge = ESTADO_BADGE[status] || { status: 'default', text: status || 'no integrada' };
    const enlaces = enlacesDe(plataforma, onReportar);

    const tip = [
        sinceHuman && `Desde ${sinceHuman}`,
        containers?.total && `${containers.running}/${containers.total} contenedores`,
    ].filter(Boolean).join(' · ');

    const identidad = (
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <Tooltip title={tip || undefined}>
                <span><Badge status={badge.status} /></span>
            </Tooltip>
            <Text strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
            </Text>
            <Tag
                color={version ? 'blue' : 'default'}
                style={{ marginInlineEnd: 0, fontVariantNumeric: 'tabular-nums' }}
            >
                {version ? `v${version}` : 'sin versión'}
            </Tag>
        </span>
    );

    const disponibilidad = (
        <Text type="secondary" style={{ fontSize: 11, textAlign: 'right' }}>
            {uptime24h != null ? `${uptime24h}%` : '—'}
        </Text>
    );

    const acciones = (
        <span style={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: ANCHO_ENLACES }}>
            {enlaces}
        </span>
    );

    const motivo = detail && status !== 'ok' && (
        <Text style={{
            fontSize: 12,
            color: SEMANTIC.danger,
            background: SEMANTIC.dangerSoft,
            borderRadius: 4,
            padding: '4px 8px',
            lineHeight: 1.5,
            alignSelf: 'flex-start',
        }}>
            <ExclamationCircleOutlined style={{ marginRight: 6 }} />{detail}
        </Text>
    );

    if (compacta) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{identidad}</span>
                    {disponibilidad}
                    {acciones}
                </div>
                <BarraDisponibilidad tramos={tramos} />
                {motivo}
            </div>
        );
    }

    return (
        <div style={{ padding: '5px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: columnas, gap: 8, alignItems: 'center' }}>
                {identidad}
                <BarraDisponibilidad tramos={tramos} />
                {disponibilidad}
                {acciones}
            </div>
            {motivo && <div style={{ marginTop: 8 }}>{motivo}</div>}
        </div>
    );
}
