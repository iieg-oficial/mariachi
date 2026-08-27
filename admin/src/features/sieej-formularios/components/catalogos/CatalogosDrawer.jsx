import { Drawer, Typography } from 'antd';
import CatalogosManager from './CatalogosManager';

export default function CatalogosDrawer({ open, onClose, clave }) {
    return (
        <Drawer
            title="Administrar catálogos"
            open={open}
            onClose={onClose}
            size={560}
            destroyOnClose
        >
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                Listas globales compartidas entre formularios: editar una afecta a todos los
                campos enlazados. Renombrar una opción actualiza también los envíos que ya la
                eligieron; borrarla se bloquea si está en uso.
            </Typography.Paragraph>
            <CatalogosManager clave={clave} />
        </Drawer>
    );
}
