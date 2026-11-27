import { Form } from 'antd';
import MetadataPreview from '@features/mapalab-layers/components/layersEditor/MetadataPreview';
import { METADATA_FIELDS } from '@features/mapalab-layers/utils/layerDiff';
import SideBySide from '@features/revision/components/SideBySide';

const Nada = () => null;

function Ficha({ valores, etiqueta }) {
    const [form] = Form.useForm();
    return (
        <Form form={form} initialValues={valores} component={false}>
            {Object.keys(METADATA_FIELDS).map((campo) => (
                <Form.Item key={campo} name={campo} noStyle><Nada /></Form.Item>
            ))}
            <MetadataPreview form={form} layerLabel={etiqueta} />
        </Form>
    );
}

export default function MetadataDiff({ publicado, cambios, etiqueta }) {
    return (
        <SideBySide
            antes={<Ficha valores={publicado || {}} etiqueta={etiqueta} />}
            despues={<Ficha valores={{ ...publicado, ...cambios }} etiqueta={etiqueta} />}
        />
    );
}
