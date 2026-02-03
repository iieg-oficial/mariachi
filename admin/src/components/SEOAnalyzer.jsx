import { useEffect, useState } from 'react';
import { Card, Progress, Space, Typography, List, Tag, Collapse, Alert, Statistic, Row, Col } from 'antd';
import {
    CheckCircleOutlined,
    WarningOutlined,
    CloseCircleOutlined,
    SearchOutlined,
    FileTextOutlined,
    LinkOutlined,
    BulbOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const SEOAnalyzer = ({ page, seo }) => {
    const [analysis, setAnalysis] = useState({
        score: 0,
        issues: [],
        suggestions: [],
        keywords: {},
        readability: {}
    });

    useEffect(() => {
        if (page && seo) {
            performAnalysis();
        }
    }, [page, seo]);

    const performAnalysis = () => {
        const issues = [];
        const suggestions = [];
        let score = 100;

        const title = seo.metaTitle || '';
        if (!title) {
            issues.push({
                type: 'error',
                category: 'Meta Title',
                message: 'Falta el meta título',
                impact: -15,
                suggestion: 'Agrega un título descriptivo de 50-60 caracteres'
            });
            score -= 15;
        } else if (title.length < 30) {
            issues.push({
                type: 'warning',
                category: 'Meta Title',
                message: `Título muy corto (${title.length} caracteres)`,
                impact: -5,
                suggestion: 'El título debe tener entre 50-60 caracteres para mejor SEO'
            });
            score -= 5;
        } else if (title.length > 60) {
            issues.push({
                type: 'warning',
                category: 'Meta Title',
                message: `Título muy largo (${title.length} caracteres)`,
                impact: -5,
                suggestion: 'El título será cortado en los resultados de búsqueda. Máximo 60 caracteres.'
            });
            score -= 5;
        } else {
            suggestions.push({
                type: 'success',
                category: 'Meta Title',
                message: `Título óptimo (${title.length} caracteres)`
            });
        }

        const description = seo.metaDescription || '';
        if (!description) {
            issues.push({
                type: 'error',
                category: 'Meta Description',
                message: 'Falta la meta descripción',
                impact: -10,
                suggestion: 'Agrega una descripción de 150-160 caracteres'
            });
            score -= 10;
        } else if (description.length < 120) {
            issues.push({
                type: 'warning',
                category: 'Meta Description',
                message: `Descripción muy corta (${description.length} caracteres)`,
                impact: -5,
                suggestion: 'La descripción debe tener entre 150-160 caracteres'
            });
            score -= 5;
        } else if (description.length > 160) {
            issues.push({
                type: 'warning',
                category: 'Meta Description',
                message: `Descripción muy larga (${description.length} caracteres)`,
                impact: -3,
                suggestion: 'La descripción será cortada en los resultados. Máximo 160 caracteres.'
            });
            score -= 3;
        } else {
            suggestions.push({
                type: 'success',
                category: 'Meta Description',
                message: `Descripción óptima (${description.length} caracteres)`
            });
        }

        const keywords = seo.keywords || '';
        if (!keywords) {
            issues.push({
                type: 'warning',
                category: 'Keywords',
                message: 'No hay keywords definidas',
                impact: -3,
                suggestion: 'Agrega 3-5 keywords relevantes'
            });
            score -= 3;
        } else {
            const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
            if (keywordList.length < 3) {
                issues.push({
                    type: 'warning',
                    category: 'Keywords',
                    message: `Pocas keywords (${keywordList.length})`,
                    impact: -2,
                    suggestion: 'Agrega al menos 3-5 keywords relevantes'
                });
                score -= 2;
            } else if (keywordList.length > 10) {
                issues.push({
                    type: 'warning',
                    category: 'Keywords',
                    message: `Demasiadas keywords (${keywordList.length})`,
                    impact: -2,
                    suggestion: 'Enfócate en 5-7 keywords principales'
                });
                score -= 2;
            }

            const keywordAnalysis = analyzeKeywordDensity(page, keywordList);
            setAnalysis(prev => ({ ...prev, keywords: keywordAnalysis }));
        }

        if (!seo.canonicalUrl) {
            issues.push({
                type: 'info',
                category: 'Canonical URL',
                message: 'No hay URL canónica definida',
                impact: 0,
                suggestion: 'Considera agregar una URL canónica para evitar contenido duplicado'
            });
        }

        if (!seo.ogTitle || !seo.ogDescription || !seo.ogImage) {
            issues.push({
                type: 'warning',
                category: 'Open Graph',
                message: 'Open Graph incompleto',
                impact: -5,
                suggestion: 'Completa los datos de Open Graph para compartir en redes sociales'
            });
            score -= 5;
        } else {
            suggestions.push({
                type: 'success',
                category: 'Open Graph',
                message: 'Open Graph completo'
            });
        }

        if (!seo.twitterCard || !seo.twitterTitle || !seo.twitterDescription) {
            issues.push({
                type: 'info',
                category: 'Twitter Card',
                message: 'Twitter Card incompleto',
                impact: -3,
                suggestion: 'Completa los datos de Twitter Card para mejor presentación'
            });
            score -= 3;
        }

        const contentAnalysis = analyzeContent(page);
        if (contentAnalysis.wordCount < 300) {
            issues.push({
                type: 'warning',
                category: 'Contenido',
                message: `Contenido muy corto (${contentAnalysis.wordCount} palabras)`,
                impact: -8,
                suggestion: 'El contenido debe tener al menos 300 palabras para buen SEO'
            });
            score -= 8;
        }

        if (contentAnalysis.headingCount === 0) {
            issues.push({
                type: 'error',
                category: 'Estructura',
                message: 'No hay encabezados en el contenido',
                impact: -10,
                suggestion: 'Usa encabezados (H1, H2, H3) para estructurar el contenido'
            });
            score -= 10;
        }

        if (contentAnalysis.imageCount > 0 && contentAnalysis.imagesWithoutAlt > 0) {
            issues.push({
                type: 'error',
                category: 'Imágenes',
                message: `${contentAnalysis.imagesWithoutAlt} imagen(es) sin atributo alt`,
                impact: -7,
                suggestion: 'Todas las imágenes deben tener texto alternativo'
            });
            score -= 7;
        }

        const readability = analyzeReadability(page);
        setAnalysis(prev => ({ ...prev, readability }));

        setAnalysis({
            score: Math.max(0, Math.min(100, score)),
            issues,
            suggestions,
            keywords: analysis.keywords,
            readability,
            contentStats: contentAnalysis
        });
    };

    const analyzeKeywordDensity = (page, keywords) => {
        const allText = extractAllText(page).toLowerCase();
        const words = allText.split(/\s+/).filter(w => w.length > 0);
        const totalWords = words.length;

        const density = {};
        keywords.forEach(keyword => {
            const kw = keyword.toLowerCase();
            const count = (allText.match(new RegExp(kw, 'gi')) || []).length;
            const percent = totalWords > 0 ? ((count / totalWords) * 100).toFixed(2) : 0;

            density[keyword] = {
                count,
                density: percent,
                status: percent < 0.5 ? 'low' : percent > 3 ? 'high' : 'good'
            };
        });

        return density;
    };

    const analyzeContent = (page) => {
        const allText = extractAllText(page);
        const words = allText.split(/\s+/).filter(w => w.length > 0);

        let headingCount = 0;
        let imageCount = 0;
        let imagesWithoutAlt = 0;

        if (page.sections) {
            page.sections.forEach(section => {
                section.items?.forEach(item => {
                    item.components?.forEach(comp => {
                        if (comp.type === 'heading') headingCount++;
                        if (comp.type === 'image') {
                            imageCount++;
                            if (!comp.props.alt) imagesWithoutAlt++;
                        }
                    });
                });
            });
        }

        return {
            wordCount: words.length,
            characterCount: allText.length,
            headingCount,
            imageCount,
            imagesWithoutAlt
        };
    };

    const analyzeReadability = (page) => {
        const text = extractAllText(page);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);

        const avgWordsPerSentence = sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : 0;

        let readabilityScore = 100;
        if (avgWordsPerSentence > 25) readabilityScore -= 20;
        else if (avgWordsPerSentence > 20) readabilityScore -= 10;

        return {
            sentenceCount: sentences.length,
            avgWordsPerSentence,
            readabilityScore,
            level: readabilityScore >= 80 ? 'Excelente' : readabilityScore >= 60 ? 'Buena' : 'Necesita mejora'
        };
    };

    const extractAllText = (page) => {
        let text = '';
        if (page.sections) {
            page.sections.forEach(section => {
                section.items?.forEach(item => {
                    item.components?.forEach(comp => {
                        if (comp.type === 'text') text += comp.props.content + ' ';
                        if (comp.type === 'heading') text += comp.props.text + ' ';
                    });
                });
            });
        }
        return text;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#52c41a';
        if (score >= 60) return '#faad14';
        return '#ff4d4f';
    };

    const getIssueIcon = (type) => {
        switch (type) {
            case 'error': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
            case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'info': return <BulbOutlined style={{ color: '#1890ff' }} />;
            default: return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        }
    };

    const groupedIssues = {
        error: analysis.issues.filter(i => i.type === 'error'),
        warning: analysis.issues.filter(i => i.type === 'warning'),
        info: analysis.issues.filter(i => i.type === 'info')
    };

    return (
        <Card
            title={
                <Space>
                    <SearchOutlined />
                    <Title level={5} style={{ margin: 0 }}>Análisis SEO</Title>
                </Space>
            }
            style={{ marginBottom: 16 }}
        >
            <Space orientation="vertical" style={{ width: '100%' }} size="large">
                <div>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Space align="center">
                            <Text strong>Puntuación SEO:</Text>
                            <Text
                                strong
                                style={{
                                    fontSize: 24,
                                    color: getScoreColor(analysis.score)
                                }}
                            >
                                {analysis.score}/100
                            </Text>
                        </Space>
                        <Progress
                            percent={analysis.score}
                            strokeColor={getScoreColor(analysis.score)}
                            status="active"
                        />
                    </Space>
                </div>

                {analysis.contentStats && (
                    <Row gutter={16}>
                        <Col span={6}>
                            <Statistic
                                title="Palabras"
                                value={analysis.contentStats.wordCount}
                                prefix={<FileTextOutlined />}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Encabezados"
                                value={analysis.contentStats.headingCount}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Imágenes"
                                value={analysis.contentStats.imageCount}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Legibilidad"
                                value={analysis.readability.readabilityScore}
                                suffix="/100"
                            />
                        </Col>
                    </Row>
                )}

                {analysis.issues.length > 0 && (
                    <Alert
                        message={`Se encontraron ${analysis.issues.length} problema(s) de SEO`}
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
                )}

                {Object.keys(analysis.keywords).length > 0 && (
                    <Collapse>
                        <Panel
                            header={
                                <Space>
                                    <LinkOutlined />
                                    <Text strong>Densidad de Keywords</Text>
                                </Space>
                            }
                            key="keywords"
                        >
                            <List
                                dataSource={Object.entries(analysis.keywords)}
                                renderItem={([keyword, data]) => (
                                    <List.Item>
                                        <Space orientation="vertical" style={{ width: '100%' }}>
                                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                <Text strong>{keyword}</Text>
                                                <Space>
                                                    <Tag
                                                        color={
                                                            data.status === 'good' ? 'success' :
                                                            data.status === 'low' ? 'warning' : 'error'
                                                        }
                                                    >
                                                        {data.density}%
                                                    </Tag>
                                                    <Text type="secondary">{data.count} menciones</Text>
                                                </Space>
                                            </Space>
                                            {data.status === 'low' && (
                                                <Alert
                                                    message="Densidad baja"
                                                    description="Considera usar esta keyword más frecuentemente en el contenido"
                                                    type="warning"
                                                    showIcon
                                                    banner
                                                />
                                            )}
                                            {data.status === 'high' && (
                                                <Alert
                                                    message="Densidad alta"
                                                    description="Evita el keyword stuffing. Reduce el uso de esta palabra"
                                                    type="error"
                                                    showIcon
                                                    banner
                                                />
                                            )}
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Panel>
                    </Collapse>
                )}

                {analysis.issues.length > 0 && (
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
                                                avatar={getIssueIcon(issue.type)}
                                                title={
                                                    <Space>
                                                        <Text strong>{issue.category}</Text>
                                                        <Tag color="error">-{Math.abs(issue.impact)} puntos</Tag>
                                                    </Space>
                                                }
                                                description={
                                                    <Space orientation="vertical" size="small">
                                                        <Text type="secondary">{issue.message}</Text>
                                                        <Alert
                                                            message="Cómo mejorar"
                                                            description={issue.suggestion}
                                                            type="info"
                                                            showIcon
                                                            icon={<BulbOutlined />}
                                                            banner
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
                                                avatar={getIssueIcon(issue.type)}
                                                title={issue.category}
                                                description={
                                                    <Space orientation="vertical" size="small">
                                                        <Text type="secondary">{issue.message}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            💡 {issue.suggestion}
                                                        </Text>
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

                {analysis.suggestions.length > 0 && (
                    <Alert
                        message="¡Buen trabajo!"
                        description={
                            <List
                                size="small"
                                dataSource={analysis.suggestions}
                                renderItem={(item) => (
                                    <List.Item>
                                        <Space>
                                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                            <Text>{item.message}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        }
                        type="success"
                        showIcon
                    />
                )}
            </Space>
        </Card>
    );
};

export default SEOAnalyzer;
