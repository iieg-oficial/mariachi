import { useState } from 'react';
import { Card, Layout, Space, Tabs, Typography } from 'antd';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import {
    actualizarUsuario,
    crearGrupo,
    crearUsuario,
    editarGrupo,
    eliminarGrupo,
    eliminarUsuario,
    sincronizarGeoserver,
} from '@features/mapalab-acceso/api/mapalabAccesoService';
import { useMapalabAcceso } from '@features/mapalab-acceso/hooks/useMapalabAcceso';
import AccesoCapaModal from '@features/mapalab-acceso/components/AccesoCapaModal';
import CapasPrivadasTab from '@features/mapalab-acceso/components/CapasPrivadasTab';
import GrupoModal from '@features/mapalab-acceso/components/GrupoModal';
import GruposTab from '@features/mapalab-acceso/components/GruposTab';
import UsuariosTab from '@features/mapalab-acceso/components/UsuariosTab';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function MapalabAccesoPage() {
    const { isMobile } = useIsMobile();
    const { usuarios, grupos, capas, arbol, cargando, recargar, recargarArbol, ejecutar } = useMapalabAcceso();
    const [capaAbierta, setCapaAbierta] = useState(undefined);
    const [grupoAbierto, setGrupoAbierto] = useState(undefined);
    const [sincronizando, setSincronizando] = useState(false);

    const sincronizar = async () => {
        setSincronizando(true);
        const r = await ejecutar(sincronizarGeoserver, null, 'No se pudo sincronizar con GeoServer');
        setSincronizando(false);
        if (!r) return;
        if (r.conflictos.length) message.warning(`Reglas manuales en GeoServer que no se tocaron: ${r.conflictos.join(', ')}`);
        message.success(r.agregadas.length || r.quitadas.length
            ? `GeoServer al día: ${r.agregadas.length} bloqueadas, ${r.quitadas.length} liberadas`
            : 'GeoServer ya estaba al día');
    };

    const guardarGrupo = async (valores) => {
        const grupo = grupoAbierto;
        const accion = grupo ? () => editarGrupo(grupo.id, valores) : () => crearGrupo(valores);
        return Boolean(await ejecutar(accion, grupo ? 'Grupo actualizado' : 'Grupo creado', 'No se pudo guardar el grupo'));
    };

    const pestanas = [
        {
            key: 'capas',
            label: `Capas (${capas.length})`,
            children: (
                <CapasPrivadasTab
                    capas={capas}
                    cargando={cargando}
                    onEditar={(id) => setCapaAbierta(id)}
                    onMarcar={() => setCapaAbierta(null)}
                    sincronizando={sincronizando}
                    onSincronizar={sincronizar}
                />
            ),
        },
        {
            key: 'usuarios',
            label: `Personas (${usuarios.length})`,
            children: (
                <UsuariosTab
                    usuarios={usuarios}
                    grupos={grupos}
                    cargando={cargando}
                    onCrear={async (datos) => Boolean(await ejecutar(() => crearUsuario(datos), 'Persona agregada', 'No se pudo agregar'))}
                    onActivar={(id, activo) => ejecutar(() => actualizarUsuario(id, { activo }), activo ? 'Acceso reactivado' : 'Acceso suspendido', 'No se pudo cambiar')}
                    onEliminar={(id) => ejecutar(() => eliminarUsuario(id).then(() => true), 'Persona quitada', 'No se pudo quitar')}
                />
            ),
        },
        {
            key: 'grupos',
            label: `Grupos (${grupos.length})`,
            children: (
                <GruposTab
                    grupos={grupos}
                    cargando={cargando}
                    onNuevo={() => setGrupoAbierto(null)}
                    onEditar={(g) => setGrupoAbierto(g)}
                    onEliminar={(id) => ejecutar(() => eliminarGrupo(id).then(() => true), 'Grupo borrado', 'No se pudo borrar')}
                />
            ),
        },
    ];

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Capas privadas</Title>
                    <Text type="secondary">
                        Qué capas del visor no son públicas y quién las ve. Para entrar al visor, la persona necesita además el rol de MapaLab en minerva.
                    </Text>
                </div>
                <Card>
                    <Tabs items={pestanas} />
                </Card>
            </Space>
            <AccesoCapaModal
                open={capaAbierta !== undefined}
                layerId={capaAbierta}
                arbol={arbol}
                usuarios={usuarios}
                grupos={grupos}
                onClose={() => setCapaAbierta(undefined)}
                onGuardado={() => { setCapaAbierta(undefined); recargar(); recargarArbol(); }}
            />
            <GrupoModal
                open={grupoAbierto !== undefined}
                grupo={grupoAbierto}
                usuarios={usuarios}
                onClose={() => setGrupoAbierto(undefined)}
                onGuardar={guardarGrupo}
            />
        </Content>
    );
}
