import { Typography } from 'antd';
import { describeValue, labelOf, sameValue } from '@features/mapalab-layers/utils/layerDiff';

const { Text } = Typography;

const ROW = {
    display: 'grid',
    gridTemplateColumns: 'minmax(120px, 200px) minmax(0, 1fr) auto minmax(0, 1fr)',
    gap: 8,
    alignItems: 'baseline',
};

export default function FieldDiff({ cambios, publicado }) {
    const campos = Object.keys(cambios || {}).filter((campo) => campo !== 'action');
    if (!campos.length) return <Text type="secondary">El borrador no trae cambios.</Text>;
    return (
        <div style={{ display: 'grid', gap: 6 }}>
            {campos.map((campo) => {
                const antes = publicado ? describeValue(publicado[campo]) : '?';
                const despues = describeValue(cambios[campo]);
                const igual = Boolean(publicado) && sameValue(publicado[campo], cambios[campo]);
                return (
                    <div key={campo} style={ROW}>
                        <Text strong>{labelOf(campo)}</Text>
                        <Text type="secondary" delete={!igual} ellipsis={{ tooltip: antes }}>{antes}</Text>
                        <Text type="secondary">→</Text>
                        <Text ellipsis={{ tooltip: despues }}>{despues}</Text>
                    </div>
                );
            })}
        </div>
    );
}
