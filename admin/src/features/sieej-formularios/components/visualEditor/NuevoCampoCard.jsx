import { Card } from 'antd';
import FieldForm from './FieldForm';
import { COLOR_EDICION } from './FieldCard';

export default function NuevoCampoCard(props) {
    return (
        <Card
            size="small"
            title="Nuevo campo"
            styles={{ body: { padding: 8 } }}
            style={{ borderColor: COLOR_EDICION, borderWidth: 2 }}
        >
            <FieldForm {...props} />
        </Card>
    );
}
