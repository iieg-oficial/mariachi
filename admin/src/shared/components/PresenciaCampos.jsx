import { colorDe } from '@features/users/helpers/avatar';
import { CAMPO_VALIDO } from '@shared/hooks/useCampoEnfocado';

const COLOR_VALIDO = /^#[0-9A-Fa-f]{6}$/;

const primerNombre = (editor) => String(editor.name || editor.username || '')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 24);

const reglaDe = (contenedor, editor) => {
    const color = colorDe(editor.username || editor.name || '');
    if (!CAMPO_VALIDO.test(editor.campo || '') || !COLOR_VALIDO.test(color)) return '';
    const item = `${contenedor} .ant-form-item:has([id="${editor.campo}"])`;
    return `
        ${item} .ant-form-item-control-input { box-shadow: 0 0 0 2px ${color}; border-radius: 8px; transition: box-shadow .2s; }
        ${item} > .ant-row > .ant-form-item-label::after {
            content: "${primerNombre(editor)} escribiendo";
            margin-inline-start: 8px; padding: 0 8px; border-radius: 999px;
            background: ${color}; color: #fff; font-size: 11px; font-weight: 600; line-height: 18px;
        }`;
};

export default function PresenciaCampos({ contenedor, editores = [] }) {
    const css = editores.map((editor) => reglaDe(contenedor, editor)).join('\n');
    if (!css.trim()) return null;
    return <style>{css}</style>;
}
