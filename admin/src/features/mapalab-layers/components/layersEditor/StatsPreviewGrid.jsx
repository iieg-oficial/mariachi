import { useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Input, Tooltip, Typography } from 'antd';
import './statsPreviewGrid.css';

const { Text } = Typography;

const MAX_SLOTS = 8;

const formatea = (valor, simbolo) => {
    if (valor === null || valor === undefined || valor === '') return '—';
    return `${valor}${simbolo ? ` ${simbolo}` : ''}`;
};

const valorPublicado = (values, position) => {
    const hit = (values || []).find((v) => String(v.posicion) === String(position));
    return hit ? hit.valor : null;
};

export default function StatsPreviewGrid({
    config = [],
    values = [],
    liveValues = {},
    selectedIndex,
    onSelect,
    onAdd,
    canAdd = true,
    pie = '',
    editandoPie = false,
    onPieClick,
    onPieChange,
    onPieBlur,
    saving = false,
    actions = null,
}) {
    const pieRef = useRef(null);

    useEffect(() => {
        if (editandoPie) pieRef.current?.focus();
    }, [editandoPie]);

    const orden = config
        .map((slot, index) => ({ slot, index }))
        .sort((a, b) => (a.slot.position || 0) - (b.slot.position || 0));

    const huecos = Math.max(0, MAX_SLOTS - orden.length - (canAdd ? 1 : 0));

    return (
        <div className="stats-preview">
            <div className="stats-preview-head">
                <span className="stats-preview-title">Así se ve bajo la capa en el visor</span>
                <span className="stats-preview-actions">
                    {saving && <span className="stats-preview-saving">guardando…</span>}
                    {actions}
                </span>
            </div>

            <div className="stats-preview-grid">
                {orden.map(({ slot, index }) => {
                    const live = liveValues[slot.position];
                    const valor = live !== undefined ? live : valorPublicado(values, slot.position);
                    return (
                        <button
                            key={slot.position ?? index}
                            type="button"
                            className={`stats-tile${index === selectedIndex ? ' is-selected' : ''}`}
                            onClick={() => onSelect(index)}
                        >
                            <span className="stats-tile-value">{formatea(valor, slot.symbol)}</span>
                            <span className="stats-tile-label">
                                {slot.label || `Indicador ${slot.position ?? index + 1}`}
                            </span>
                        </button>
                    );
                })}

                {canAdd && (
                    <Tooltip title="Agregar indicador">
                        <button type="button" className="stats-tile-add" onClick={onAdd} aria-label="Agregar indicador">
                            <PlusOutlined />
                        </button>
                    </Tooltip>
                )}

                {Array.from({ length: huecos }, (_, k) => (
                    <span key={`hueco-${k}`} className="stats-tile-empty" aria-hidden="true" />
                ))}
            </div>

            <div className="stats-preview-pie">
                {editandoPie ? (
                    <Input.TextArea
                        ref={pieRef}
                        rows={2}
                        value={pie}
                        onChange={(e) => onPieChange(e.target.value)}
                        onBlur={onPieBlur}
                        placeholder="Nota al pie de la numeralia"
                        variant="borderless"
                        className="stats-preview-pie-input"
                    />
                ) : (
                    <Tooltip title={onPieClick ? 'Click para editar la nota al pie' : ''}>
                        <button
                            type="button"
                            className="stats-preview-pie-text"
                            onClick={onPieClick}
                            disabled={!onPieClick}
                        >
                            {pie || 'Agregar nota al pie…'}
                        </button>
                    </Tooltip>
                )}
            </div>

            {orden.length === 0 && (
                <Text className="stats-preview-vacio">
                    Esta capa todavía no muestra numeralia en el visor.
                </Text>
            )}
        </div>
    );
}
