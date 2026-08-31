import { Link } from 'react-router';
import { Grid, Typography } from 'antd';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function SectionHeader({
    icon,
    title,
    subtitle,
    to,
    badge,
    actionLabel = 'Ver detalles',
    color = '#5C2472',
}) {
    const pantalla = useBreakpoint();
    const compacto = !pantalla.md;

    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
            }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {icon && <span style={{ fontSize: 20, color, display: 'inline-flex' }}>{icon}</span>}
                    <Text strong style={{ fontSize: 18 }}>
                        {title}
                        {subtitle && (
                            <Text type="secondary" style={{ fontSize: 18, fontWeight: 400 }}> — {subtitle}</Text>
                        )}
                    </Text>
                    {badge && !compacto && <span>{badge}</span>}
                </span>
                {to && (
                    <Link to={to} style={{ flex: 'none' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{actionLabel} →</Text>
                    </Link>
                )}
            </div>
            {badge && compacto && <div style={{ marginTop: 8 }}>{badge}</div>}
        </div>
    );
}
