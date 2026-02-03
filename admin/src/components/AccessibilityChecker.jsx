import { Card, Alert, List, Tag, Progress, Space, Typography, Collapse, Button, Tooltip } from 'antd';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
    EyeOutlined, FileTextOutlined, BulbOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const WCAG_LEVELS = {
    A: { label: 'A', color: 'red', description: 'Nivel mínimo' },
    AA: { label: 'AA', color: 'orange', description: 'Nivel medio (recomendado)' },
    AAA: { label: 'AAA', color: 'green', description: 'Nivel máximo' }
};

const findComponentsByType = (page, type) => {
    if (!page || !page.sections) return [];

    const components = [];
    page.sections.forEach(section => {
        section.items?.forEach(item => {
            item.components?.forEach(comp => {
                if (comp.type === type) {
                    components.push(comp);
                }
            });
        });
    });
    return components;
};

const evaluateAccessibility = (page) => {
    const foundIssues = [];

    if (!page) {
        return { issues: foundIssues, score: 0 };
    }

    const imageComponents = findComponentsByType(page, 'image');
    imageComponents.forEach((img, index) => {
        if (!img.props.alt || img.props.alt.trim() === '') {
            foundIssues.push({
                level: 'error',
                wcagLevel: 'A',
                criterion: 'WCAG 1.1.1',
                title: 'Imagen sin texto alternativo',
                description: `Imagen #${index + 1} no tiene atributo alt`,
                suggestion: 'Agrega una descripción de la imagen en el campo "Texto alternativo"',
                impact: 'Crítico'
            });
        }
    });

    const headings = findComponentsByType(page, 'heading');
    if (headings.length > 0) {
        const levels = headings.map(h => h.props.level || 1);
        const firstLevel = levels[0];

        if (firstLevel !== 1) {
            foundIssues.push({
                level: 'warning',
                wcagLevel: 'AA',
                criterion: 'WCAG 2.4.6',
                title: 'Estructura de encabezados incorrecta',
                description: 'La página no comienza con un encabezado H1',
                suggestion: 'Usa H1 para el título principal de la página',
                impact: 'Medio'
            });
        }

        for (let i = 1; i < levels.length; i++) {
            if (levels[i] - levels[i - 1] > 1) {
                foundIssues.push({
                    level: 'warning',
                    wcagLevel: 'AA',
                    criterion: 'WCAG 2.4.6',
                    title: 'Salto en niveles de encabezado',
                    description: `Salto de H${levels[i - 1]} a H${levels[i]}`,
                    suggestion: 'Los encabezados deben seguir una jerarquía lógica sin saltos',
                    impact: 'Medio'
                });
            }
        }
    } else {
        foundIssues.push({
            level: 'warning',
            wcagLevel: 'AA',
            criterion: 'WCAG 2.4.6',
            title: 'Sin encabezados',
            description: 'La página no tiene encabezados',
            suggestion: 'Agrega encabezados para estructurar el contenido',
            impact: 'Medio'
        });
    }

    const textComponents = findComponentsByType(page, 'text');
    textComponents.forEach((text, index) => {
        const content = text.props.content || '';
        if (content.length > 500) {
            const words = content.split(/\s+/).length;
            if (words > 100) {
                foundIssues.push({
                    level: 'info',
                    wcagLevel: 'AAA',
                    criterion: 'WCAG 3.1.5',
                    title: 'Texto muy largo',
                    description: `Bloque de texto #${index + 1} tiene ${words} palabras`,
                    suggestion: 'Considera dividir el texto en párrafos más cortos para mejorar la legibilidad',
                    impact: 'Bajo'
                });
            }
        }
    });

    if (!page.seo || !page.seo.metaTitle || page.seo.metaTitle.trim() === '') {
        foundIssues.push({
            level: 'error',
            wcagLevel: 'A',
            criterion: 'WCAG 2.4.2',
            title: 'Sin título de página',
            description: 'La página no tiene un título definido',
            suggestion: 'Agrega un título descriptivo en la sección SEO',
            impact: 'Crítico'
        });
    }

    if (page.sections && page.sections.length === 0) {
        foundIssues.push({
            level: 'info',
            wcagLevel: 'A',
            criterion: 'WCAG 1.4.3',
            title: 'Página vacía',
            description: 'La página no tiene contenido',
            suggestion: 'Agrega contenido a la página',
            impact: 'Alto'
        });
    }

    const errors = foundIssues.filter(i => i.level === 'error').length;
    const warnings = foundIssues.filter(i => i.level === 'warning').length;
    const calculatedScore = Math.max(0, 100 - (errors * 15) - (warnings * 5));

    return { issues: foundIssues, score: calculatedScore };
};

const AccessibilityChecker = ({ page, onValidate }) => {
    const [validationKey, setValidationKey] = useState(0);
    const { issues, score } = useMemo(
        () => evaluateAccessibility(page),
        [page, validationKey]
    );

    useEffect(() => {
        if (page && onValidate) {
            onValidate({ issues, score });
        }
    }, [issues, score, onValidate, page]);

    const handleRevalidate = useCallback(() => {
        setValidationKey(prev => prev + 1);
    }, []);

    const getScoreColor = (score) => {
        if (score >= 90) return '#52c41a';
        if (score >= 70) return '#faad14';
        return '#ff4d4f';
    };

    const getIssueIcon = (level) => {
        switch (level) {
        case 'error': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
        case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
        case 'info': return <BulbOutlined style={{ color: '#1890ff' }} />;
        default: return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        }
    };

    const getImpactColor = (impact) => {
        switch (impact) {
        case 'Crítico': return 'error';
        case 'Alto': return 'error';
        case 'Medio': return 'warning';
        case 'Bajo': return 'default';
        default: return 'default';
        }
    };

    const groupedIssues = {
        error: issues.filter(i => i.level === 'error'),
        warning: issues.filter(i => i.level === 'warning'),
        info: issues.filter(i => i.level === 'info')
    };

    return (
        <Card
            title={
                <Space>
                    <EyeOutlined />
                    <Title level={5} style={{ margin: 0 }}>Validador de Accesibilidad (WCAG 2.1)</Title>
                </Space>
            }
            extra={
                <Button
                    size="small"
                    onClick={handleRevalidate}
                >
                    Re-validar
                </Button>
            }
        >
            <Space orientation="vertical" style={{ width: '100%' }} size="large">
                <div>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Space align="center">
                            <Text strong>Puntuación de Accesibilidad:</Text>
                            <Text
                                strong
                                style={{
                                    fontSize: 24,
                                    color: getScoreColor(score)
                                }}
                            >
                                {score}/100
                            </Text>
                        </Space>
                        <Progress
                            percent={score}
                            strokeColor={getScoreColor(score)}
                            status="active"
                        />
                    </Space>
                </div>

                {issues.length > 0 ? (
                    <Alert
                        message={`Se encontraron ${issues.length} problemas de accesibilidad`}
                        description={
                            <Space>
                                {groupedIssues.error.length > 0 && (
                                    <Tag color="error">{groupedIssues.error.length} críticos</Tag>
                                )}
                                {groupedIssues.warning.length > 0 && (
                                    <Tag color="warning">{groupedIssues.warning.length} advertencias</Tag>
                                )}
                                {groupedIssues.info.length > 0 && (
                                    <Tag color="blue">{groupedIssues.info.length} sugerencias</Tag>
                                )}
                            </Space>
                        }
                        type={groupedIssues.error.length > 0 ? 'error' : 'warning'}
                        showIcon
                    />
                ) : (
                    <Alert
                        message="¡Excelente!"
                        description="No se encontraron problemas de accesibilidad"
                        type="success"
                        showIcon
                        icon={<CheckCircleOutlined />}
                    />
                )}

                {issues.length > 0 && (
                    <Collapse defaultActiveKey={groupedIssues.error.length > 0 ? ['errors'] : []}>
                        {groupedIssues.error.length > 0 && (
                            <Panel
                                header={
                                    <Space>
                                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                                        <Text strong>Problemas Críticos ({groupedIssues.error.length})</Text>
                                    </Space>
                                }
                                key="errors"
                            >
                                <List
                                    dataSource={groupedIssues.error}
                                    renderItem={(issue) => (
                                        <List.Item>
                                            <List.Item.Meta
                                                avatar={getIssueIcon(issue.level)}
                                                title={
                                                    <Space>
                                                        <Text strong>{issue.title}</Text>
                                                        <Tag color={WCAG_LEVELS[issue.wcagLevel].color}>
                                                            {issue.wcagLevel}
                                                        </Tag>
                                                        <Tag color={getImpactColor(issue.impact)}>
                                                            {issue.impact}
                                                        </Tag>
                                                    </Space>
                                                }
                                                description={
                                                    <Space orientation="vertical" size="small">
                                                        <Text type="secondary">{issue.description}</Text>
                                                        <Text type="secondary">
                                                            <FileTextOutlined /> {issue.criterion}
                                                        </Text>
                                                        <Alert
                                                            message="Sugerencia"
                                                            description={issue.suggestion}
                                                            type="info"
                                                            showIcon
                                                            icon={<BulbOutlined />}
                                                            style={{ marginTop: 8 }}
                                                        />
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </Panel>
                        )}

                        {groupedIssues.warning.length > 0 && (
                            <Panel
                                header={
                                    <Space>
                                        <WarningOutlined style={{ color: '#faad14' }} />
                                        <Text strong>Advertencias ({groupedIssues.warning.length})</Text>
                                    </Space>
                                }
                                key="warnings"
                            >
                                <List
                                    dataSource={groupedIssues.warning}
                                    renderItem={(issue) => (
                                        <List.Item>
                                            <List.Item.Meta
                                                avatar={getIssueIcon(issue.level)}
                                                title={
                                                    <Space>
                                                        <Text>{issue.title}</Text>
                                                        <Tag color={WCAG_LEVELS[issue.wcagLevel].color}>
                                                            {issue.wcagLevel}
                                                        </Tag>
                                                    </Space>
                                                }
                                                description={
                                                    <Space orientation="vertical" size="small">
                                                        <Text type="secondary">{issue.description}</Text>
                                                        <Tooltip title={issue.suggestion}>
                                                            <Button type="link" size="small" icon={<BulbOutlined />}>
                                                                Ver sugerencia
                                                            </Button>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </Panel>
                        )}
                    </Collapse>
                )}

                <Alert
                    message="Sobre los Niveles WCAG"
                    description={
                        <Space orientation="vertical">
                            {Object.entries(WCAG_LEVELS).map(([key, level]) => (
                                <div key={key}>
                                    <Tag color={level.color}>{level.label}</Tag>
                                    <Text type="secondary">{level.description}</Text>
                                </div>
                            ))}
                            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                                Se recomienda cumplir al menos con el nivel AA para sitios gubernamentales.
                            </Paragraph>
                        </Space>
                    }
                    type="info"
                    showIcon
                />
            </Space>
        </Card>
    );
};

export default AccessibilityChecker;
