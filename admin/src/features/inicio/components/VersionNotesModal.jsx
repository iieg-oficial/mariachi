import { useEffect, useState } from 'react';
import { Modal, Collapse, Space, Tag, Typography, Empty, Spin } from 'antd';
import Markdown from '@shared/components/Markdown';
import { getNotasVersion } from '@features/inicio/api/inicioService';

const { Text } = Typography;

export default function VersionNotesModal({ open, onClose }) {
    const [notasVersion, setNotasVersion] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!open || loaded) return;
        let cancelled = false;
        setLoading(true);
        getNotasVersion(10)
            .then((data) => { if (!cancelled) { setNotasVersion(data); setLoaded(true); } })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, loaded]);

    const notasItems = notasVersion.map((release, index) => ({
        key: `${release.version}-${index}`,
        label: (
            <Space>
                <Tag color="blue">v{release.version}</Tag>
                {release.fecha && <Text type="secondary" style={{ fontSize: 12 }}>{release.fecha}</Text>}
            </Space>
        ),
        children: (
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                {release.secciones.map((sec, i) => (
                    <div key={i}>
                        {sec.titulo && <Text strong>{sec.titulo}</Text>}
                        <Markdown text={sec.contenido} />
                    </div>
                ))}
            </Space>
        ),
    }));

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title="Notas de versión"
            width={720}
            styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : notasVersion.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin notas disponibles" />
            ) : (
                <Collapse items={notasItems} defaultActiveKey={[notasItems[0]?.key]} />
            )}
        </Modal>
    );
}
