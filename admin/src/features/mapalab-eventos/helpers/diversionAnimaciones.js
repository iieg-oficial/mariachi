const AGUILA = '<svg viewBox="0 0 64 36" width="46" height="26" style="overflow:visible"><g data-ala style="transform-box:view-box;transform-origin:32px 16px"><path d="M31 16 C24 5 11 2 2 7 C11 9 20 13 29 18 Z" fill="#3B2A22"/></g><g data-ala style="transform-box:view-box;transform-origin:32px 16px"><path d="M33 16 C40 5 53 2 62 7 C53 9 44 13 35 18 Z" fill="#3B2A22"/></g><ellipse cx="32" cy="18" rx="6" ry="3.4" fill="#4A352A"/><circle cx="38.6" cy="15.6" r="2.6" fill="#F4EFE9"/><path d="M40.6 15.2 L43.6 16.2 L40.6 17.2 Z" fill="#E9A31B"/><path d="M26.5 18.5 L20.5 22.5 L22 18 Z" fill="#3B2A22"/></svg>';
const PARVADA = 4;
const CENTRO_AGUILA = { x: 11, y: 7 };

const nodoSimbolo = (symbol, px) => {
    if ((symbol?.kind === 'image' || symbol?.kind === 'svg') && symbol.imageUrl) {
        const img = document.createElement('img');
        img.src = symbol.imageUrl;
        img.alt = '';
        img.style.cssText = `width:${px}px;height:${px}px;display:block`;
        return img;
    }
    const span = document.createElement('span');
    span.textContent = symbol?.value || '⚽';
    span.style.cssText = `font-size:${px}px;line-height:1;display:block`;
    return span;
};

const volar = (el, frames, duracion, retraso) => el.animate(frames, { duration: duracion, delay: retraso, easing: 'ease-in-out', fill: 'forwards' });

const crearAguila = (escenario, origen, carga) => {
    const el = document.createElement('div');
    el.dataset.vuelo = '';
    el.style.cssText = `position:absolute;left:${origen.x - 12}px;top:${origen.y - 6}px;z-index:2`;
    el.innerHTML = AGUILA;
    if (carga) {
        const nodo = nodoSimbolo(carga, 13);
        nodo.style.margin = '-6px auto 0';
        el.appendChild(nodo);
    }
    escenario.appendChild(el);
    el.querySelectorAll('[data-ala]').forEach((ala) => ala.animate(
        [{ transform: 'scaleY(1)' }, { transform: 'scaleY(-0.45)' }],
        { duration: 300, iterations: Infinity, direction: 'alternate' },
    ));
    return el;
};

export const limpiarVuelos = (escenario) => escenario.querySelectorAll('[data-vuelo]').forEach((el) => el.remove());

export const rebotar = (escenario, origen, symbol) => {
    const el = document.createElement('div');
    el.dataset.vuelo = '';
    el.style.cssText = `position:absolute;left:${origen.x - 4}px;top:${origen.y - 4}px;z-index:2`;
    el.appendChild(nodoSimbolo(symbol, 24));
    escenario.appendChild(el);
    const dx = 60 + Math.random() * Math.min(160, escenario.clientWidth * 0.4);
    const suelo = escenario.clientHeight - origen.y - 28;
    const paso = (fx, fy, giro, offset, opacity = 1) => ({ transform: `translate(${dx * fx}px, ${suelo * fy}px) rotate(${giro}deg)`, opacity, offset });
    el.animate([
        paso(0, 0, 0, 0), paso(0.1, 1, 360, 0.25), paso(0.45, 0.55, 700, 0.42), paso(0.7, 1, 1000, 0.58),
        paso(0.88, 0.82, 1200, 0.7), paso(1, 1, 1350, 0.8), paso(1, 1, 1350, 0.92), paso(1, 1, 1350, 1, 0),
    ], { duration: 3600, easing: 'linear', fill: 'forwards' });
};

export const aguilas = (escenario, origen, symbol) => {
    const W = escenario.clientWidth;
    for (let i = 0; i < PARVADA; i += 1) {
        const el = crearAguila(escenario, origen, i === 0 ? symbol : null);
        const frames = Array.from({ length: 13 }, (_, k) => {
            const t = k / 12;
            const x = (W + 80 - origen.x) * t;
            const y = -40 * t + Math.sin(t * Math.PI * 2.2 + i * 0.9) * 11 - i * 7 * t;
            return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`, offset: t };
        });
        volar(el, frames, 3000, i * 160);
    }
};

export const aguilasAlCentro = (escenario, origen, symbol, duracion) => {
    const cx = escenario.clientWidth / 2;
    const cy = escenario.clientHeight / 2;
    for (let i = 0; i < PARVADA; i += 1) {
        const el = crearAguila(escenario, origen, i === 0 ? symbol : null);
        const retraso = i * 140;
        const finX = cx - origen.x - CENTRO_AGUILA.x + (i === 0 ? 0 : (i - 2) * 26);
        const finY = cy - origen.y - CENTRO_AGUILA.y - 30 - (i === 0 ? 0 : 14);
        const frames = Array.from({ length: 13 }, (_, k) => {
            const t = k / 12;
            const x = finX * t;
            const y = finY * t - Math.sin(t * Math.PI) * 45 + Math.sin(t * Math.PI * 3 + i) * 6 * (1 - t);
            return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`, offset: t };
        });
        volar(el, frames, duracion - retraso, retraso);
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: duracion + 150, fill: 'forwards' });
    }
};
