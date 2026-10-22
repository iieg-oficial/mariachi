import { Button, Input, Modal, Space, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { formatoFecha } from '../helpers/estadoCuenta';

const { Text } = Typography;

const PROPOSITO = { invite: 'Invitación', reset: 'Restablecimiento' };

export default function EnlaceAccesoModal({ enlace, onClose }) {
    const copiar = () => {
        navigator.clipboard?.writeText(enlace.url).then(
            () => message.success('Enlace copiado'),
            () => message.error('No se pudo copiar el enlace'),
        );
    };

    return (
        <Modal
            title="Enlace de acceso"
            open={Boolean(enlace)}
            onCancel={onClose}
            footer={<Button shape="round" onClick={onClose}>Listo</Button>}
            destroyOnHidden
        >
            {enlace && (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Text type="secondary">
                        {PROPOSITO[enlace.purpose] || 'Enlace'} · vence {formatoFecha(enlace.expires_at)}
                    </Text>
                    <Space.Compact style={{ width: '100%' }}>
                        <Input readOnly value={enlace.url} onFocus={(e) => e.target.select()} />
                        <Button type="primary" icon={<CopyOutlined />} onClick={copiar}>Copiar</Button>
                    </Space.Compact>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Solo se muestra esta vez. Entrégalo a la persona por un canal de confianza.
                    </Text>
                </Space>
            )}
        </Modal>
    );
}
