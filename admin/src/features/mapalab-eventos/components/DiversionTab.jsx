import { Form, Input, Segmented } from 'antd';
import { ANIMACIONES, DECORACIONES } from '@features/mapalab-eventos/constants/diversion';
import BotonEstiloField from './BotonEstiloField';
import DiversionPreview from './DiversionPreview';
import FactsField from './FactsField';
import IconoBotonField from './IconoBotonField';

const OPCIONES_ANIMACION = ANIMACIONES.map(({ value, label }) => ({ value, label }));
const OPCIONES_DECORACION = DECORACIONES.map(({ value, label }) => ({ value, label }));

export default function DiversionTab() {
    const form = Form.useFormInstance();
    const animacion = Form.useWatch('animacion', form);
    const funIcon = Form.useWatch('funIcon', form);
    const botonEstilo = Form.useWatch('botonEstilo', form);
    const facts = Form.useWatch('facts', form);

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <DiversionPreview animacion={animacion} funIcon={funIcon} botonEstilo={botonEstilo} facts={facts} />
            </div>
            <Form.Item
                name="decoracion"
                label="Decoración"
                extra="Tema que el visitante enciende desde el botón del borde del menú. Arranca apagado en cada visita."
            >
                <Segmented options={OPCIONES_DECORACION} />
            </Form.Item>
            <Form.Item name="animacion" label="Animación por defecto" extra="Cada dato curioso puede cambiarla por la suya.">
                <Segmented options={OPCIONES_ANIMACION} />
            </Form.Item>
            <Form.Item
                name="funIcon"
                label="Ícono del botón"
                extra="Dinámico: muestra el símbolo del próximo dato. Fijo: no cambia y solo la animación usa el de cada dato."
            >
                <IconoBotonField />
            </Form.Item>
            <Form.Item name="botonEstilo" label="Estilo del botón">
                <BotonEstiloField />
            </Form.Item>
            <Form.Item name="avisoInicial" label="Aviso inicial" extra="Una vez por visitante. Déjalo vacío para no mostrar aviso.">
                <Input maxLength={80} showCount allowClear placeholder="¡Toca aquí para un dato curioso!" />
            </Form.Item>
            <Form.Item name="facts" label="Datos curiosos" extra="Sin datos curiosos, el botón no aparece en el visor.">
                <FactsField animacionEvento={animacion} />
            </Form.Item>
        </>
    );
}
