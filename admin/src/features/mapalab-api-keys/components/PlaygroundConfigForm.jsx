import {
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    Radio,
    Row,
    Typography,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import LayerTreeSelect from '@features/mapalab-api-keys/components/LayerTreeSelect';
import ZoomRangeField from '@shared/components/ZoomRangeField';

const { Text } = Typography;

export default function PlaygroundConfigForm({
    manualKey,
    setManualKey,
    mode,
    setMode,
    selectedLayers,
    setSelectedLayers,
    share,
    setShare,
    center,
    setCenter,
    zoom,
    setZoom,
    height,
    setHeight,
    baseUrl,
    setBaseUrl,
    embedLabel,
    setEmbedLabel,
    saving,
    canSaveEmbed,
    onSaveEmbed,
}) {
    return (
        <Card title="Configura el mapa que quieres mostrar" size="small">
            <Form layout="vertical" size="small">
                <Form.Item
                    label="Contraseña completa de la llave"
                    tooltip="Pega aquí la contraseña que se mostró cuando creaste o renovaste la llave. Solo se usa para previsualizar; no se guarda en ningún lado."
                >
                    <Input.Password
                        placeholder="Ejemplo: mk_pub_kRrt--DdlbJCIs…"
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                    />
                </Form.Item>

                <Form.Item
                    label="¿Cómo quieres armar el mapa?"
                    tooltip="Por capas: tú eliges qué capas mostrar y cómo se ve. Por código: pegas un código corto que reproduce un mapa que alguien ya armó en el visor MapaLab."
                >
                    <Radio.Group
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="layers">Eligiendo capas</Radio.Button>
                        <Radio.Button value="share">Con un código de mapa</Radio.Button>
                    </Radio.Group>
                </Form.Item>

                {mode === 'layers' ? (
                    <>
                        <Form.Item
                            label="Capas a mostrar"
                            tooltip="Las capas son la información que se va a dibujar sobre el mapa base (por ejemplo: límites de municipios, hospitales, cultivos, indicadores sociales, etc.). Puedes seleccionar varias y se mostrarán encimadas en el mismo mapa."
                        >
                            <LayerTreeSelect
                                value={selectedLayers}
                                onChange={setSelectedLayers}
                                placeholder="Busca o expande las categorías para elegir capas"
                            />
                        </Form.Item>
                        <Form.Item
                            label="Vista inicial del mapa (centro y nivel de acercamiento)"
                            tooltip="Es la ubicación y qué tan cerca se ve el mapa cuando alguien lo abre por primera vez. La forma más fácil de ajustarla es mover y hacer zoom en la previsualización de la derecha; estos valores se llenan solos."
                            extra={<Text type="secondary" style={{ fontSize: 11 }}>Estos valores se actualizan automáticamente al mover el mapa de la derecha. También puedes ajustarlos a mano.</Text>}
                        >
                            <Input
                                value={center}
                                onChange={(e) => setCenter(e.target.value)}
                                placeholder="Ejemplo: 20.67,-103.35"
                                addonBefore="Centro"
                            />
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Nivel de acercamiento</Text>
                                <ZoomRangeField mode="single" value={zoom} onChange={setZoom} />
                            </div>
                        </Form.Item>
                    </>
                ) : (
                    <Form.Item
                        label="Código del mapa guardado"
                        tooltip="Es el código corto (10 letras y números) que aparece en el visor MapaLab cuando alguien hace click en 'Compartir'. Si la institución te lo envió, pégalo aquí."
                        extra={<Text type="secondary" style={{ fontSize: 11 }}>El código reproduce un mapa exactamente como lo armó quien lo compartió (mismas capas, mismos filtros, misma vista).</Text>}
                    >
                        <Input
                            value={share}
                            onChange={(e) => setShare(e.target.value)}
                            placeholder="Ejemplo: zoqpv4eu2t"
                            maxLength={10}
                            allowClear
                        />
                    </Form.Item>
                )}

                <Row gutter={[8, 8]}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            label="Altura del mapa en la página (en píxeles)"
                            tooltip="Qué tan alto se va a ver el mapa cuando esté embebido. Un valor típico es 500 píxeles (medio espacio de pantalla)."
                        >
                            <InputNumber
                                min={200}
                                max={2000}
                                value={height}
                                onChange={setHeight}
                                style={{ width: '100%' }}
                                placeholder="Ejemplo: 500"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            label="Dirección del visor MapaLab"
                            tooltip="Es la página de IIEG que sirve el visor. Normalmente no necesitas cambiarlo; solo ajústalo si estás probando contra otro entorno."
                        >
                            <Input
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="Ejemplo: https://iieg.gob.mx/mapalab"
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    label="Nombre para identificar este mapa después"
                    tooltip="Solo aparece en este panel administrativo. Te ayuda a recordar qué muestra cada mapa guardado sin tener que abrirlo."
                >
                    <Input
                        value={embedLabel}
                        onChange={(e) => setEmbedLabel(e.target.value)}
                        placeholder="Ejemplo: Cultivos Jalisco — sección Estadísticas"
                        maxLength={150}
                    />
                </Form.Item>

                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    disabled={!canSaveEmbed}
                    onClick={onSaveEmbed}
                    block
                >
                    Guardar este mapa para usarlo después
                </Button>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                    Queda guardado en la lista de abajo y nunca expira mientras siga vinculado a esta llave.
                </Text>
            </Form>
        </Card>
    );
}
