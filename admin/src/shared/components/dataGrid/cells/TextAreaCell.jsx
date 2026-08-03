import { memo, useEffect, useRef } from 'react';
import { Input, Popover, Typography } from 'antd';

const { Text } = Typography;

const PREVIEW_STYLE = {
    width: '100%',
    padding: '0 8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.6',
};

const TextAreaCell = memo(({ rowData, setRowData, focus, stopEditing, columnData }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (!focus) return;
        const timer = setTimeout(() => {
            const input = ref.current?.resizableTextArea?.textArea;
            input?.focus();
            input?.setSelectionRange(input.value.length, input.value.length);
        }, 0);
        return () => clearTimeout(timer);
    }, [focus]);

    const handleKeyDown = (event) => {
        if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
            event.preventDefault();
            stopEditing({ nextRow: false });
        }
    };

    return (
        <Popover
            open={focus}
            trigger={[]}
            placement="bottomLeft"
            arrow={false}
            styles={{ body: { padding: 4 } }}
            content={(
                <div style={{ width: columnData?.overlayWidth || 460 }}>
                    <Input.TextArea
                        ref={ref}
                        value={rowData ?? ''}
                        onChange={(event) => setRowData(event.target.value || null)}
                        onKeyDown={handleKeyDown}
                        autoSize={{ minRows: 5, maxRows: 14 }}
                        style={{ fontSize: 13 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11, padding: '2px 4px', display: 'block' }}>
                        Esc o Ctrl+Enter para cerrar
                    </Text>
                </div>
            )}
        >
            <div style={PREVIEW_STYLE}>{rowData ?? ''}</div>
        </Popover>
    );
});

TextAreaCell.displayName = 'TextAreaCell';

export default TextAreaCell;
