export default function RoadmapMarco({ marcoRef, cargando, pantallaCompleta, children }) {
    const mostrar = () => {
        if (cargando) return 'none';
        return pantallaCompleta ? 'flex' : 'block';
    };

    return (
        <div
            ref={marcoRef}
            data-marco="roadmap"
            style={{
                position: 'relative',
                display: mostrar(),
                flexDirection: 'column',
                colorScheme: 'light',
                background: '#fff',
                padding: pantallaCompleta ? 16 : 0,
                height: pantallaCompleta ? '100%' : 'auto',
                overflow: pantallaCompleta ? 'hidden' : 'visible',
            }}
        >
            {children}
        </div>
    );
}
