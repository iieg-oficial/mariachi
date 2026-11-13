import { checkboxColumn, keyColumn, textColumn } from 'react-datasheet-grid';
import ParentCell from '@shared/components/dataGrid/cells/ParentCell';
import SelectCell from '@shared/components/dataGrid/cells/SelectCell';
import TextAreaCell from '@shared/components/dataGrid/cells/TextAreaCell';
import { describeCell, withCellInfo } from '@shared/components/dataGrid/cellInfo';

const selectColumn = (options) => ({
    component: SelectCell,
    columnData: { options },
    disableKeys: true,
    keepFocus: true,
    deleteValue: () => null,
    copyValue: ({ rowData }) => rowData ?? '',
    pasteValue: ({ value }) => {
        const match = options.find(
            (option) => String(option.value).toLowerCase() === String(value).trim().toLowerCase(),
        );
        return match ? match.value : (String(value).trim() || null);
    },
});

const textAreaColumn = (meta) => ({
    component: TextAreaCell,
    columnData: { overlayWidth: Math.max(meta.width || 0, 460) },
    disableKeys: true,
    keepFocus: true,
    deleteValue: () => null,
    copyValue: ({ rowData }) => rowData ?? '',
    pasteValue: ({ value }) => String(value ?? '').trim() || null,
    isCellEmpty: ({ rowData }) => !rowData,
});

const parentColumn = (context) => ({
    component: ParentCell,
    columnData: { treeData: context?.treeData || [], pathOf: context?.pathOf || ((id) => id) },
    disableKeys: true,
    keepFocus: true,
    deleteValue: () => null,
    copyValue: ({ rowData }) => rowData ?? '',
    pasteValue: ({ value }) => String(value ?? '').trim() || null,
});

const baseColumnFor = (meta, catalogs, context, columnTypes) => {
    if (columnTypes?.[meta.type]) return columnTypes[meta.type];
    if (meta.type === 'parent') return parentColumn(context);
    if (meta.type === 'bool') return checkboxColumn;
    if (meta.type === 'select') return selectColumn(catalogs?.[meta.optionsKey] || []);
    if (meta.type === 'textarea') return textAreaColumn(meta);
    return textColumn;
};

export const buildGridColumns = ({
    columnsMeta,
    catalogs,
    draft,
    rowKeyField,
    conflictKeys,
    isCellDisabled,
    columnContext,
    baseByKey,
    lastChanges,
    columnTypes,
}) => columnsMeta
    .filter((meta) => !meta.sticky)
    .map((meta) => {
        const isDirty = (rowKey) => Boolean(
            draft?.[rowKey] && Object.prototype.hasOwnProperty.call(draft[rowKey], meta.key),
        );
        const infoOf = (rowData) => {
            const rowKey = rowData?.[rowKeyField];
            return describeCell({
                isDirty: isDirty(rowKey),
                baseValue: baseByKey?.get(rowKey)?.[meta.key],
                lastChange: lastChanges?.get(`${rowKey}::${meta.key}`),
            });
        };
        return {
            ...withCellInfo(keyColumn(meta.key, baseColumnFor(meta, catalogs, columnContext, columnTypes)), infoOf),
            title: meta.title,
            minWidth: meta.width || 160,
            basis: meta.width || 160,
            grow: 0,
            disabled: ({ rowData }) => {
                if (meta.editable === false) return true;
                return isCellDisabled ? isCellDisabled(rowData, meta) : false;
            },
            cellClassName: ({ rowData }) => {
                const rowKey = rowData?.[rowKeyField];
                const cellId = `${rowKey}::${meta.key}`;
                if (conflictKeys?.has(cellId)) return 'grid-cell-conflict';
                if (isDirty(rowKey)) return 'grid-cell-dirty';
                if (lastChanges?.has(cellId)) return 'grid-cell-changed';
                if (isCellDisabled && isCellDisabled(rowData, meta)) return 'grid-cell-locked';
                return undefined;
            },
        };
    });

