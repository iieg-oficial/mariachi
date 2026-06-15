import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Divider, Segmented, Switch, Tag, Tooltip, Typography } from 'antd';
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import PasswordStrengthIndicator from '@shared/components/PasswordStrengthIndicator';
import { isStrongEnough } from '@shared/helpers/passwordStrength';
import api from '@shared/services/api';
import DependenciaSelect from './DependenciaSelect';
import { metaFor, EXTERNAL_SUBS } from '../constants/projectAccess';

const { Text } = Typography;

const ROLE_OPTIONS = [
    {
        value: 'tetlamamakani',
        label: 'Administradora',
        description: 'Acceso total al panel y a todos los proyectos. Gestiona usuarios, revisiones y configuración. No requiere asignar proyectos.',
    },
    {
        value: 'editora',
        label: 'Editora',
        description: 'Staff del IIEG. Entra al panel y trabaja solo en los proyectos que le asignes abajo, como editor o solo lectura.',
    },
    {
        value: 'externo',
        label: 'Externo',
        description: 'No accede al panel administrativo. Usa las plataformas públicas (por ejemplo SIEEJ) según los proyectos que le asignes abajo.',
    },
];

const roleDescription = (role) => ROLE_OPTIONS.find((o) => o.value === role)?.description;

export default function UserFormModal({ open, editingUser, projects, grupos = [], isMobile, form, onCancel, onSubmit }) {
    const selectedRole = Form.useWatch('role', form);
    const passwordWatch = Form.useWatch('password', form) || '';
    const projectAssignments = Form.useWatch('project_assignments', form) || {};
    const usernameWatch = Form.useWatch('username', form);

    const [usernameStatus, setUsernameStatus] = useState(null);
    const checkRef = useRef(null);

    useEffect(() => {
        const value = (usernameWatch || '').trim().toLowerCase();
        if (!value || value.length < 3) {
            setUsernameStatus(null);
            return;
        }
        const current = (editingUser?.username || '').toLowerCase();
        if (current && value === current) {
            setUsernameStatus('available');
            return;
        }
        setUsernameStatus('checking');
        const tid = setTimeout(async () => {
            try {
                const res = await api.get(`/usuarios/check-usuario/${encodeURIComponent(value)}`);
                setUsernameStatus(res.data.available ? 'available' : 'taken');
            } catch {
                setUsernameStatus(null);
            }
        }, 400);
        checkRef.current = tid;
        return () => clearTimeout(tid);
    }, [usernameWatch, editingUser]);

    const isEditora = selectedRole === 'editora';
    const isExterno = selectedRole === 'externo';
    const platformProjects = projects.filter((p) => metaFor(p.slug).kind === 'platform');
    const acervoProjects = projects.filter((p) => metaFor(p.slug).kind === 'acervo');
    const externalProjects = projects.filter((p) => metaFor(p.slug).external);

    const renderEnableSwitch = (slug) => (
        <Form.Item name={['project_assignments', slug, 'enabled']} valuePropName="checked" noStyle>
            <Switch size="small" />
        </Form.Item>
    );

    return (
        <Modal
            title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText={editingUser ? 'Actualizar' : 'Crear'}
            cancelText="Cancelar"
            width={isMobile ? '100%' : 560}
            centered={isMobile}
            destroyOnHidden
        >
            <Form form={form} layout="vertical" onFinish={onSubmit}>
                <Form.Item
                    label="Usuario"
                    name="username"
                    getValueFromEvent={(e) => e.target.value?.replace(/\s/g, '')}
                    rules={[
                        { required: true, message: 'Por favor ingrese el usuario' },
                        { min: 3, max: 50, message: 'El usuario debe tener entre 3 y 50 caracteres' },
                    ]}
                >
                    <Input
                        placeholder="ej. maria.lopez"
                        suffix={
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14 }}>
                                {usernameStatus === 'checking' && <LoadingOutlined style={{ color: '#8c8c8c' }} />}
                                {usernameStatus === 'available' && <CheckCircleFilled style={{ color: '#52c41a' }} />}
                                {usernameStatus === 'taken' && <CloseCircleFilled style={{ color: '#ff4d4f' }} />}
                            </span>
                        }
                    />
                </Form.Item>
                <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontSize: 12 }}>
                    {usernameStatus === 'checking'
                        ? 'Verificando disponibilidad…'
                        : usernameStatus === 'available'
                            ? 'Usuario disponible'
                            : usernameStatus === 'taken'
                                ? 'Este usuario ya existe'
                                : 'Identificador único para iniciar sesión, sin espacios.'}
                </Text>
                <Form.Item
                    label="Nombre"
                    name="name"
                    rules={[
                        { required: true, message: 'Por favor ingrese el nombre' },
                        { max: 100, message: 'El nombre no puede exceder 100 caracteres' },
                    ]}
                >
                    <Input placeholder="ej. María López García" />
                </Form.Item>
                <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontSize: 12 }}>
                    Nombre completo tal como aparecerá en el sistema.
                </Text>
                <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                        { required: true, message: 'Por favor ingrese el email' },
                        { type: 'email', message: 'Email no válido' },
                    ]}
                >
                    <Input placeholder="ej. maria.lopez@iieg.gob.mx" />
                </Form.Item>
                <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontSize: 12 }}>
                    Dirección de correo electrónico del usuario.
                </Text>

                {!editingUser && (
                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[
                            { required: true, message: 'Por favor ingrese la contraseña' },
                            {
                                validator: (_, value) => (
                                    !value || isStrongEnough(value)
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('La contraseña no cumple con los requisitos mínimos.'))
                                ),
                            },
                        ]}
                    >
                        <Input.Password placeholder="Crea una contraseña segura" />
                    </Form.Item>
                )}
                {!editingUser && <PasswordStrengthIndicator password={passwordWatch} />}

                <Form.Item label="Rol" name="role" rules={[{ required: true, message: 'Por favor seleccione el rol' }]}>
                    <Segmented
                        block
                        options={ROLE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                    />
                </Form.Item>
                {selectedRole && (
                    <Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 16, fontSize: 13 }}>
                        {roleDescription(selectedRole)}
                    </Text>
                )}

                {isEditora && platformProjects.length > 0 && (
                    <>
                        <Divider orientation="left" style={{ marginTop: 8 }}>Plataformas y acceso</Divider>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                            Activa los proyectos a los que tendrá acceso y define su nivel. El acceso a un proyecto también incluye sus archivos en el Acervo.
                        </Text>
                        {platformProjects.map((project) => {
                            const assignment = projectAssignments?.[project.slug];
                            const enabled = assignment?.enabled;
                            const meta = metaFor(project.slug);
                            const roleHelp = assignment?.project_role === 'viewer' ? meta.viewer : meta.editor;
                            return (
                                <div key={project.slug} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {renderEnableSwitch(project.slug)}
                                        <span style={{ flex: 1, fontWeight: 500 }}>{project.name}</span>
                                        {enabled ? (
                                            <Form.Item
                                                name={['project_assignments', project.slug, 'project_role']}
                                                noStyle
                                            >
                                                <Segmented
                                                    size="small"
                                                    options={[
                                                        { label: 'Editor', value: 'editor' },
                                                        { label: 'Solo lectura', value: 'viewer' },
                                                    ]}
                                                />
                                            </Form.Item>
                                        ) : (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Activa para definir el rol
                                            </Text>
                                        )}
                                    </div>
                                    {enabled && (
                                        <Text type="secondary" style={{ display: 'block', marginTop: 2, marginLeft: 44, fontSize: 12 }}>
                                            {roleHelp}
                                        </Text>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}

                {isEditora && acervoProjects.length > 0 && (
                    <>
                        <Divider orientation="left" style={{ marginTop: 8 }}>Acervo</Divider>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                            Acceso directo a estas carpetas de archivos. Selecciona las que necesite.
                        </Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {acervoProjects.map((project) => {
                                const checked = !!projectAssignments?.[project.slug]?.enabled;
                                return (
                                    <Tooltip key={project.slug} title={metaFor(project.slug).note}>
                                        <Form.Item name={['project_assignments', project.slug, 'enabled']} valuePropName="checked" noStyle>
                                            <Tag.CheckableTag
                                                style={{
                                                    padding: '5px 14px',
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    borderRadius: 6,
                                                    transition: 'all 0.2s',
                                                    ...(checked
                                                        ? {
                                                            background: '#2e4372',
                                                            color: '#fff',
                                                            borderColor: '#2e4372',
                                                        }
                                                        : {
                                                            background: '#fff',
                                                            color: '#8c8c8c',
                                                            borderColor: '#d9d9d9',
                                                            borderStyle: 'dashed',
                                                        }),
                                                }}
                                            >
                                                {project.name}
                                            </Tag.CheckableTag>
                                        </Form.Item>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </>
                )}

                {isExterno && externalProjects.length > 0 && (
                    <>
                        <Divider orientation="left" style={{ marginTop: 8 }}>Acceso</Divider>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                            Un usuario externo solo puede responder formularios. Activa el acceso que necesite.
                        </Text>
                        {externalProjects.map((project) => {
                            const enabled = projectAssignments?.[project.slug]?.enabled;
                            const sub = EXTERNAL_SUBS[project.slug];
                            return (
                                <div key={project.slug} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        {renderEnableSwitch(project.slug)}
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 500 }}>{project.name}</span>
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                {metaFor(project.slug).external}
                                            </Text>
                                        </div>
                                    </div>
                                    {enabled && sub && sub === 'dependency' && (
                                        <div style={{ marginLeft: 44, marginTop: 12 }}>
                                            <Form.Item
                                                label="Dependencia (opcional)"
                                                tooltip="Agrupa al usuario por dependencia. Hereda los formularios de SIEEJ asignados a ese grupo."
                                            >
                                                <DependenciaSelect form={form} grupos={grupos} />
                                            </Form.Item>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <Form.Item name="sieej_grupo_id" hidden><Input /></Form.Item>
                        <Form.Item name="sieej_grupo_nombre" hidden><Input /></Form.Item>
                    </>
                )}
            </Form>
        </Modal>
    );
}
