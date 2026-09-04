import { Form, Switch } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import './appearancePanel.css';

function Fila({ item }) {
    if (item.propio) {
        return <div className="ap-fila ap-fila-propio">{item.children}</div>;
    }

    return (
        <div className="ap-fila">
            <div className="ap-cabeza">
                <Form.Item name={item.name} valuePropName="checked" noStyle>
                    <Switch />
                </Form.Item>
                <span className="ap-titulo">{item.titulo}</span>
                <InfoIcon title={item.ayuda} />
            </div>
        </div>
    );
}

export default function AppearancePanel({ items }) {
    return (
        <div className="ap-panel">
            {items.map((item) => (
                <Fila key={item.key} item={item} />
            ))}
        </div>
    );
}
