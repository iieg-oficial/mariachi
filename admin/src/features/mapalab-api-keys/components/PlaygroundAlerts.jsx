import { Alert, Button } from 'antd';

export default function PlaygroundAlerts({
    originAllowed,
    adminOrigin,
    grantingOrigin,
    onGrantOrigin,
    missingLayers,
    labelByRef,
    grantingLayers,
    onGrantLayers,
    initialPlainKey,
}) {
    return (
        <>
            {!originAllowed && adminOrigin && (
                <Alert
                    type="warning"
                    showIcon
                    closable
                    message={`Esta página (${adminOrigin}) no está autorizada para mostrar el mapa con esta llave`}
                    description="Mientras no esté autorizada, la previsualización va a fallar. Puedes agregarla con un click."
                    action={
                        <Button type="primary" size="small" loading={grantingOrigin} onClick={onGrantOrigin}>
                            Autorizar esta página
                        </Button>
                    }
                />
            )}
            {missingLayers.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    closable
                    message={`${missingLayers.length} capa(s) no están autorizadas para esta llave`}
                    description={`Capas faltantes: ${missingLayers.map((l) => labelByRef[l] || l).join(', ')}. La llave debe autorizarlas para poder mostrarlas en el mapa.`}
                    action={
                        <Button type="primary" size="small" loading={grantingLayers} onClick={onGrantLayers}>
                            Autorizar capas faltantes
                        </Button>
                    }
                />
            )}
            {!initialPlainKey && (
                <Alert
                    type="info"
                    showIcon
                    closable
                    message="Pega la contraseña completa de la llave para previsualizar"
                    description="Por seguridad, solo guardamos un resumen de la contraseña. Si la acabas de crear, cópiala del aviso que apareció. Si ya no la tienes, puedes generar una nueva desde el menú de tres puntos (⋮) → 'Generar contraseña nueva'."
                />
            )}
        </>
    );
}
