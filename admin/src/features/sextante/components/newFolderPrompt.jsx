import { Input, Modal, Space, Typography } from 'antd';
import { message } from '@shared/services/message';
import { FOLDER_NAME_RE } from '@features/sextante/utils/geoserverFiles';

const { Text } = Typography;

export function promptNewFolder(currentPath, onCreated) {
    let name = '';
    Modal.confirm({
        title: 'Nueva carpeta',
        content: (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text type="secondary" style={{ fontSize: 12 }}>
                    La carpeta se crea cuando subas el primer archivo dentro.
                </Text>
                <Input
                    placeholder="Ej. tiff"
                    maxLength={60}
                    onChange={(e) => { name = e.target.value.trim(); }}
                />
            </Space>
        ),
        okText: 'Crear y entrar',
        cancelText: 'Cancelar',
        onOk: () => {
            if (!name || !FOLDER_NAME_RE.test(name)) {
                message.error('Nombre inválido: solo letras, números, guion, guion bajo y punto');
                return Promise.reject(new Error('invalid'));
            }
            const fullPath = currentPath ? `${currentPath}/${name}` : name;
            onCreated(fullPath);
            return Promise.resolve();
        },
    });
}
