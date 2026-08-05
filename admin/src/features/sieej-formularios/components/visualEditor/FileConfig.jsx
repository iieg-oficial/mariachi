import { useEffect } from 'react';
import { Form, InputNumber, Select } from 'antd';
import useAccessibleBuckets from '@features/acervo/hooks/useAccessibleBuckets';

const EXTENSION_OPTIONS = [
    '.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx', '.txt',
    '.jpg', '.jpeg', '.png', '.zip', '.json', '.geojson', '.gpkg', '.kml', '.shp',
].map((ext) => ({ value: ext, label: ext }));

const BUCKET_POR_DEFECTO = 'sieej';

export default function FileConfig({ form }) {
    const { buckets, loading } = useAccessibleBuckets();

    useEffect(() => {
        if (
            !form.getFieldValue('bucket')
            && buckets.some((b) => b.acervo_bucket === BUCKET_POR_DEFECTO)
        ) {
            form.setFieldsValue({ bucket: BUCKET_POR_DEFECTO });
        }
    }, [buckets, form]);

    const bucketOptions = buckets.map((b) => ({
        value: b.acervo_bucket,
        label: b.display_name || b.acervo_bucket,
    }));

    return (
        <>
            <Form.Item
                label="Bucket Acervo"
                name="bucket"
                rules={[{ required: true }]}
                extra={`Carpeta del Acervo donde se guardan los archivos que suba quien responde el formulario. Por defecto se usa «${BUCKET_POR_DEFECTO}».`}
            >
                <Select
                    placeholder="Selecciona un bucket"
                    loading={loading}
                    showSearch
                    optionFilterProp="label"
                    options={bucketOptions}
                />
            </Form.Item>
            <Form.Item
                label="Extensiones aceptadas"
                name="accept"
                extra="Selecciona de la lista o escribe una extensión con punto. Vacío acepta todos los formatos."
            >
                <Select
                    mode="tags"
                    allowClear
                    tokenSeparators={[',', ' ']}
                    options={EXTENSION_OPTIONS}
                    placeholder=".pdf, .csv, .xlsx"
                />
            </Form.Item>
            <Form.Item label="Tamaño máximo (MB)" name="maxSizeMB">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
        </>
    );
}
