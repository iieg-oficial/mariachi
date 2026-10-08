import { Alert } from 'antd';

export default function LayerGroupWarning({ workspace, layerName }) {
    return (
        <Alert
            type="info"
            showIcon
            closable
            title="Esta capa es un Layer Group de GeoServer"
            description={
                <div>
                    <p style={{ marginBottom: 8 }}>
                        <code>{workspace}:{layerName}</code> está configurado en GeoServer como <strong>Layer Group</strong> (varias capas combinadas en una sola entidad), no como capa individual.
                    </p>
                    <p style={{ marginBottom: 0 }}>
                        El editor solo soporta SLDs de capas individuales. Para modificar la simbología, edita el estilo de cada capa miembro del grupo por separado, o pide apoyo al equipo de geografía.
                    </p>
                </div>
            }
        />
    );
}
