import { useMemo } from 'react';
import { Form, Select } from 'antd';
import { opcionesColumnaFecha } from '@features/mapalab-layers/utils/columnaFecha';

const TOOLTIP = 'La columna con la que el visor filtra y anima por fecha. Vacía, usa la columna con el comentario mapalab:fecha o, si no hay, fecha. Si la renombran en la base, se cambia aquí. Toma efecto en el siguiente refresco de periodicidad (03:00). Si varias capas comparten tabla, conviene que elijan la misma.';

const ColumnaFechaField = ({ form, availableFields, fieldsLoading }) => {
    const geometryType = Form.useWatch('geometryType', form);
    const actual = Form.useWatch('dateColumn', form);
    const options = useMemo(() => opcionesColumnaFecha(availableFields, actual), [availableFields, actual]);

    if (geometryType === 'raster') return <Form.Item name="dateColumn" noStyle />;

    return (
        <Form.Item
            label="Columna de fecha"
            name="dateColumn"
            tooltip={TOOLTIP}
            normalize={(v) => v || null}
        >
            <Select
                options={options}
                placeholder="Automática (mapalab:fecha o fecha)"
                showSearch
                allowClear
                loading={fieldsLoading}
                optionFilterProp="label"
            />
        </Form.Item>
    );
};

export default ColumnaFechaField;
