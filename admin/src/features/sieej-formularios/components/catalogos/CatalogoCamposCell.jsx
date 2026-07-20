import { Tag, Tooltip, Typography } from 'antd';

const agruparPorFormulario = (campos) => {
    const grupos = new Map();
    campos.forEach((c) => {
        const grupo = grupos.get(c.formulario_id)
            ?? { id: c.formulario_id, formulario: c.formulario, campos: [] };
        grupo.campos.push(c);
        grupos.set(c.formulario_id, grupo);
    });
    return [...grupos.values()];
};

export default function CatalogoCamposCell({ campos = [] }) {
    if (campos.length === 0) {
        return (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Ningún campo lo usa
            </Typography.Text>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agruparPorFormulario(campos).map(({ id, formulario, campos: lista }) => (
                <div key={id}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {formulario}
                    </Typography.Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {lista.map((c) => (
                            <Tooltip
                                key={`${c.step_id}-${c.field_name}`}
                                title={`Paso: ${c.step_id} · campo: ${c.field_name}`}
                            >
                                <Tag style={{ margin: 0 }}>
                                    {c.field_label || c.field_name}
                                </Tag>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
