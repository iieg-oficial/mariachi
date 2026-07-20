import { Form, Switch, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import CatalogPicker from './CatalogPicker';
import { DEFAULT_OPEN_RANGE_CATALOG } from '../../constants/definitionTypes';

const TOOLTIP_COMPARTIDO = 'Las opciones salen de un catálogo compartido entre formularios: '
    + 'si agregas o renombras una opción, el cambio aplica en todos los campos que lo usan.';

export default function OpenRangeConfig({ form }) {
    const openStart = Form.useWatch('openStart', form);
    const openEnd = Form.useWatch('openEnd', form);
    const algunoAbierto = openStart || openEnd;

    return (
        <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fafafa',
            padding: 12,
            marginBottom: 16,
        }}>
            <div style={{ fontWeight: 500, marginBottom: 4, color: '#191919' }}>
                Fechas abiertas
                <Tooltip title={TOOLTIP_COMPARTIDO}>
                    <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                Por defecto ambos extremos exigen una fecha. Activa un extremo para que
                quien responde pueda elegir una opción del catálogo en su lugar
                («10/02/1992 a NO DETERMINADO»).
            </div>
            <Form.Item
                label="Fecha inicial abierta"
                name="openStart"
                valuePropName="checked"
                style={{ marginBottom: 12 }}
            >
                <Switch />
            </Form.Item>
            <Form.Item
                label="Fecha final abierta"
                name="openEnd"
                valuePropName="checked"
                style={{ marginBottom: 12 }}
                extra="Útil cuando el periodo sigue vigente o la fecha de término aún no se determina."
            >
                <Switch />
            </Form.Item>
            {algunoAbierto && (
                <CatalogPicker
                    form={form}
                    name="openCatalog"
                    label="Catálogo de opciones"
                    extra={`De aquí salen las opciones que sustituyen a la fecha. Por defecto «${DEFAULT_OPEN_RANGE_CATALOG}», compartido por todos los formularios.`}
                    rules={[{ required: true, message: 'Elige el catálogo del que salen las opciones.' }]}
                />
            )}
        </div>
    );
}
