import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { pintarBloque } from '@features/mapalab-layers/components/layersEditor/infoBoxPainters';

const LARGO = 'ESCUELASECUNDARIATECNICANUMEROCIENTOCUARENTAYDOSJOSEMARIAMORELOSYPAVON';

const corta = (el) => {
    const s = getComputedStyle(el);
    return s.overflowWrap === 'anywhere' || s.wordBreak === 'break-word';
};

describe('los pintores no dejan que el contenido desborde la tarjeta', () => {
    it('el valor de un renglón parte palabra', () => {
        render(<div>{pintarBloque({ type: 'list', key: 'list', rows: [{ label: 'Nombre', value: LARGO }] })}</div>);
        expect(corta(screen.getByText(LARGO))).toBe(true);
    });

    it('una etiqueta larga se acomoda en varias líneas', () => {
        render(<div>{pintarBloque({ type: 'labelGroups', key: 'lg', groups: [{ labels: [{ value: LARGO }] }] })}</div>);
        const tag = screen.getByText(LARGO);
        expect(getComputedStyle(tag).whiteSpace).toBe('normal');
        expect(corta(tag)).toBe(true);
    });

    it('el texto de un ícono parte palabra', () => {
        render(<div>{pintarBloque({ type: 'iconText', key: 'it', items: [{ icon: 'web', value: LARGO }] })}</div>);
        expect(corta(screen.getByText(LARGO))).toBe(true);
    });

    it('una cifra y su etiqueta parten palabra', () => {
        render(<div>{pintarBloque({ type: 'cards', key: 'c', columns: 2, cards: [{ label: LARGO, value: '12', suffix: '' }] })}</div>);
        expect(corta(screen.getByText(LARGO))).toBe(true);
    });

    it('un párrafo parte palabra', () => {
        render(<div>{pintarBloque({ type: 'text', key: 't', items: [{ label: null, value: LARGO }] })}</div>);
        expect(corta(screen.getByText(LARGO))).toBe(true);
    });
});
