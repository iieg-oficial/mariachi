export const ANIMACIONES = [{ value: 'explosion', label: 'Explosión' }];

export const separarEmojis = (texto) => {
    const segmentos = typeof Intl.Segmenter === 'function'
        ? [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(String(texto ?? ''))].map((s) => s.segment)
        : [...String(texto ?? '')];
    return segmentos.filter((s) => s.trim());
};

const azar = (minimo, maximo) => minimo + Math.random() * (maximo - minimo);

export const lanzarFestejo = (x, y, emojis) => {
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (quieto || !emojis.length || typeof document.body.animate !== 'function') return;
    for (let n = 0; n < 36; n += 1) {
        const angulo = azar(0, Math.PI * 2);
        const distancia = azar(90, 360);
        const dx = Math.cos(angulo) * distancia;
        const dy = Math.sin(angulo) * distancia - azar(40, 160);
        const giro = azar(-540, 540);
        const escala = azar(0.8, 1.7);
        const particula = document.createElement('span');
        particula.textContent = emojis[n % emojis.length];
        particula.setAttribute('aria-hidden', 'true');
        Object.assign(particula.style, {
            position: 'fixed', left: `${x}px`, top: `${y}px`, fontSize: '30px', pointerEvents: 'none', zIndex: 2000,
        });
        document.body.append(particula);
        particula.animate([
            { transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${escala}) rotate(${giro}deg)`, opacity: 1, offset: 0.55 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 180}px)) scale(${escala}) rotate(${giro * 1.5}deg)`, opacity: 0 },
        ], { duration: azar(1100, 1800), delay: azar(0, 90), easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'both' })
            .finished.then(() => particula.remove(), () => particula.remove());
    }
};

const FESTEJO = /^@festejo:(\d+)$/;

export const aEnlaceConFestejo = ({ festejo_id: festejoId, ...valores }) => (
    festejoId ? { ...valores, enlace: `@festejo:${festejoId}` } : valores
);

export const deEnlaceConFestejo = (fila) => {
    const encontrado = FESTEJO.exec(fila.enlace ?? '');
    return encontrado ? { ...fila, enlace: '', festejo_id: Number(encontrado[1]) } : fila;
};
