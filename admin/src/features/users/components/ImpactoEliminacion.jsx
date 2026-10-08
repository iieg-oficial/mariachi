import { Alert, Typography } from 'antd';

const { Text } = Typography;

const lineasImpacto = (impacto) => {
    if (!impacto) return [];
    const lineas = [];
    if (impacto.envios) {
        lineas.push(`${impacto.envios} envío(s) de SIEEJ, con sus archivos e historial de captura`);
    }
    if (impacto.grupos) {
        lineas.push(`Su pertenencia a ${impacto.grupos} dependencia(s) de SIEEJ`);
    }
    if (impacto.proyectos) {
        lineas.push(`${impacto.proyectos} asignación(es) de proyecto`);
    }
    return lineas;
};

export default function ImpactoEliminacion({ usuario, impacto }) {
    const lineas = lineasImpacto(impacto);

    return (
        <div>
            <Text>Se eliminará el usuario: <Text strong>{usuario.name}</Text> (@{usuario.username}).</Text>
            {impacto === null && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 12 }}
                    title="No se pudo calcular el impacto"
                    description="Borrar arrastra en cascada sus envíos de SIEEJ y sus asignaciones. Verifica antes de continuar."
                />
            )}
            {lineas.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 12 }}
                    title="Se borrará también, y no se puede deshacer:"
                    description={(
                        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                            {lineas.map((linea) => <li key={linea}>{linea}</li>)}
                        </ul>
                    )}
                />
            )}
            {impacto && lineas.length === 0 && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 12 }}
                    title="No tiene envíos, dependencias ni proyectos asignados."
                />
            )}
        </div>
    );
}
