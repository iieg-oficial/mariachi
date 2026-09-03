import RoadmapEditorModal from '@features/inicio/components/roadmap/RoadmapEditorModal';
import RoadmapMarcadorModal from '@features/inicio/components/roadmap/RoadmapMarcadorModal';

export default function RoadmapModales({
    verFormulario, verMarcador, activo, tipo, hitos, marcador, guardando, contenedor,
    onGuardar, onEliminar, onElegirMarcador, onCerrarFormulario, onCerrarMarcador,
}) {
    return (
        <>
            <RoadmapEditorModal
                abierto={verFormulario}
                item={activo}
                tipo={tipo}
                hitos={hitos}
                guardando={guardando}
                contenedor={contenedor}
                onGuardar={onGuardar}
                onEliminar={onEliminar}
                onCerrar={onCerrarFormulario}
            />
            <RoadmapMarcadorModal
                abierto={verMarcador}
                marcador={marcador}
                contenedor={contenedor}
                onElegir={onElegirMarcador}
                onCerrar={onCerrarMarcador}
            />
        </>
    );
}
