import { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, Space } from 'antd';
import { EditorDescripcion, EditorDiagrama, EditorEjecucion, EditorTexto } from './editoresTexto';
import { EditorFuente, EditorNotas, EditorVariables } from './editoresListas';
import { TIPOS } from '../constants/secciones';

const EDITORES = {
    descripcion: EditorDescripcion,
    fuente: EditorFuente,
    variables: EditorVariables,
    ejecucion: EditorEjecucion,
    diagrama: EditorDiagrama,
    texto: EditorTexto,
};

export default function SeccionDrawer({ seccion, medicion, abierto, soloLectura, onCerrar, onAplicar }) {
    const [borrador, setBorrador] = useState(seccion);

    useEffect(() => { setBorrador(seccion); }, [seccion]);

    if (!borrador) return null;

    const cambiarContenido = (contenido) => setBorrador({ ...borrador, contenido });
    const objetos = borrador.tipo === 'tablas'
        ? medicion?.base?.tablas || []
        : medicion?.base?.vistas || [];
    const Editor = EDITORES[borrador.tipo];

    return (
        <Drawer
            title={`Editar: ${TIPOS[borrador.tipo]?.etiqueta}`}
            open={abierto}
            onClose={onCerrar}
            width={720}
            destroyOnHidden
            extra={(
                <Space>
                    <Button shape="round" onClick={onCerrar}>Cancelar</Button>
                    <Button shape="round" type="primary" disabled={soloLectura} onClick={() => onAplicar(borrador)}>
                        Aplicar
                    </Button>
                </Space>
            )}
        >
            <Form layout="vertical">
                <Form.Item label="Título de la sección">
                    <Input
                        value={borrador.titulo}
                        maxLength={200}
                        onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
                    />
                </Form.Item>
            </Form>
            {Editor && <Editor contenido={borrador.contenido} onChange={cambiarContenido} />}
            {(borrador.tipo === 'tablas' || borrador.tipo === 'vistas') && (
                <EditorNotas
                    contenido={borrador.contenido}
                    onChange={cambiarContenido}
                    objetos={objetos}
                    tipo={borrador.tipo}
                />
            )}
        </Drawer>
    );
}
