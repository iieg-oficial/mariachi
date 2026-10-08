import { Alert, Button, Card, Space, Steps, Table, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

const DESCARGA_URL = import.meta.env.VITE_QGIS_PLUGIN_URL
    || '/acervo/mapalab/plugin/mapalab-qgis.zip';

const DESCARGA_NOMBRE = DESCARGA_URL.split('/').pop();

const PASOS = [
    {
        title: 'Descargar el complemento',
        description: 'El archivo .zip de aquí abajo. No hace falta descomprimirlo.',
    },
    {
        title: 'Abrir el administrador de complementos',
        description: 'En QGIS: menú Complementos → Administrar e instalar complementos.',
    },
    {
        title: 'Instalar a partir de ZIP',
        description: 'Pestaña «Instalar a partir de ZIP», elegir el archivo descargado y pulsar «Instalar complemento». QGIS avisa que es un complemento sin firmar: es normal, se acepta.',
    },
    {
        title: 'Confirmar que quedó',
        description: 'En la pestaña «Instalados» debe aparecer «MapaLab» con su casilla marcada, y en la barra de herramientas el ícono de MapaLab.',
    },
    {
        title: 'Escribir la dirección del servidor',
        description: 'Al abrir el panel por primera vez pide el servidor. Se escribe una sola vez: queda guardada en el perfil de QGIS, no se vuelve a pedir.',
    },
    {
        title: 'Aceptar el certificado, si lo pide',
        description: 'Con certificado propio, QGIS muestra el aviso de conexión no confiable antes de cargar el catálogo. Al aceptar la excepción, el árbol de temas aparece en el panel.',
    },
];

const PERFILES = [
    { so: 'Linux', ruta: '~/.local/share/QGIS/QGIS3/profiles/default/python/plugins/' },
    { so: 'Windows', ruta: '%APPDATA%\\QGIS\\QGIS3\\profiles\\default\\python\\plugins\\' },
    { so: 'macOS', ruta: '~/Library/Application Support/QGIS/QGIS3/profiles/default/python/plugins/' },
];

const PERFIL_COLUMNS = [
    { title: 'Sistema', dataIndex: 'so', key: 'so', width: 110, render: (v) => <Text strong>{v}</Text> },
    { title: 'Carpeta de complementos del perfil', dataIndex: 'ruta', key: 'ruta', render: (v) => <Text code>{v}</Text> },
];

const SITUACIONES = [
    {
        caso: 'Actualizar a una versión nueva',
        que: 'Instalar el ZIP nuevo con los mismos pasos, encima del anterior. Si el panel estaba abierto, cerrar y volver a abrir QGIS para que cargue el código nuevo.',
    },
    {
        caso: 'Cambiar de servidor',
        que: 'Borrar la dirección guardada desde Configuración → Opciones → Avanzado, grupo mapalab, clave base_url. El panel vuelve a pedirla.',
    },
    {
        caso: 'El panel no aparece',
        que: 'Ver → Paneles → MapaLab. El ícono de la barra también lo abre y lo cierra.',
    },
    {
        caso: 'El catálogo no carga',
        que: 'Revisar que la dirección del servidor esté bien escrita y que se abra en el navegador desde ese mismo equipo. Si es un servidor interno, hace falta estar en la red o en la VPN. El detalle del error se lee en Ver → Paneles → Mensajes de registro.',
    },
    {
        caso: 'Quitar el complemento',
        que: 'Complementos → Administrar e instalar → Instalados → «MapaLab» → Desinstalar complemento.',
    },
];

const SITUACION_COLUMNS = [
    { title: 'Si necesitas', dataIndex: 'caso', key: 'caso', width: 230, render: (v) => <Text strong>{v}</Text> },
    { title: 'Qué hacer', dataIndex: 'que', key: 'que' },
];

export default function PluginQgisInstalacion() {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                title="Qué hace falta antes de empezar"
                description="QGIS 3.40 LTR y poder alcanzar el servidor. Con la dirección pública del IIEG funciona desde cualquier red, igual que abrir el visor en el navegador: no se necesita VPN, ni usuario, ni contraseña, porque todo lo que el plugin consume ya es público. La red del instituto o la VPN sólo hacen falta si se apunta a un servidor interno, como el de pruebas."
            />

            <Card
                size="small"
                title="1 · Descargar el complemento"
                extra={
                    <Button type="primary" icon={<DownloadOutlined />} href={DESCARGA_URL} download>
                        Descargar .zip
                    </Button>
                }
            >
                <Paragraph style={{ marginBottom: 0 }}>
                    Un solo archivo, <Text code>{DESCARGA_NOMBRE}</Text>, con todo lo que el complemento
                    necesita. Es el mismo paquete para Linux, Windows y macOS, y se instala desde el propio
                    QGIS sin permisos de administrador.
                </Paragraph>
            </Card>

            <Card size="small" title="2 · Instalarlo en QGIS">
                <Steps orientation="vertical" size="small" current={-1} items={PASOS} />
            </Card>

            <Card size="small" title="Instalación alternativa: copiar la carpeta">
                <Paragraph>
                    Sirve cuando el administrador de complementos está bloqueado por política del equipo.
                    Se descomprime el ZIP y la carpeta <Text code>mapalab</Text> que trae dentro se deja tal
                    cual en la carpeta de complementos del perfil. Al reiniciar QGIS aparece en «Instalados»,
                    donde hay que marcarla.
                </Paragraph>
                <Table
                    dataSource={PERFILES}
                    columns={PERFIL_COLUMNS}
                    rowKey="so"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Card size="small" title="Casos que se presentan seguido">
                <Table
                    dataSource={SITUACIONES}
                    columns={SITUACION_COLUMNS}
                    rowKey="caso"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Alert
                type="warning"
                showIcon
                title="Todavía no hay repositorio de complementos"
                description="Mientras no se publique el repositorio propio en el gateway, cada actualización se instala a mano con el ZIP. Cuando exista, bastará con agregar su dirección una vez en Complementos → Configuración y QGIS avisará solo de las versiones nuevas."
            />
        </Space>
    );
}
