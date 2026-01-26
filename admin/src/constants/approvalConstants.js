import {
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    EyeOutlined
} from '@ant-design/icons';

export const APPROVAL_STATUS = {
    DRAFT: 'draft',
    PENDING_APPROVAL: 'pending_approval',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PUBLISHED: 'published'
};

export const APPROVAL_STATUS_CONFIG = {
    [APPROVAL_STATUS.DRAFT]: {
        label: 'Borrador',
        color: 'default',
        icon: EditOutlined,
        description: 'Contenido en edición'
    },
    [APPROVAL_STATUS.PENDING_APPROVAL]: {
        label: 'Pendiente de Aprobación',
        color: 'warning',
        icon: ClockCircleOutlined,
        description: 'Esperando revisión'
    },
    [APPROVAL_STATUS.APPROVED]: {
        label: 'Aprobado',
        color: 'success',
        icon: CheckCircleOutlined,
        description: 'Aprobado para publicación'
    },
    [APPROVAL_STATUS.REJECTED]: {
        label: 'Rechazado',
        color: 'error',
        icon: CloseCircleOutlined,
        description: 'Requiere cambios'
    },
    [APPROVAL_STATUS.PUBLISHED]: {
        label: 'Publicado',
        color: 'processing',
        icon: EyeOutlined,
        description: 'Visible al público'
    }
};

export const APPROVAL_PERMISSIONS = {
    tetlamamakani: {
        canRequestApproval: true,
        canApprove: true,
        canReject: true,
        canPublish: true,
        canEdit: true
    },
    editora: {
        canRequestApproval: true,
        canApprove: false,
        canReject: false,
        canPublish: false,
        canEdit: true
    },
    diseñadora: {
        canRequestApproval: true,
        canApprove: false,
        canReject: false,
        canPublish: false,
        canEdit: true
    },
    viewer: {
        canRequestApproval: false,
        canApprove: false,
        canReject: false,
        canPublish: false,
        canEdit: false
    }
};

export const ALLOWED_TRANSITIONS = {
    [APPROVAL_STATUS.DRAFT]: [APPROVAL_STATUS.PENDING_APPROVAL],
    [APPROVAL_STATUS.PENDING_APPROVAL]: [APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED],
    [APPROVAL_STATUS.APPROVED]: [APPROVAL_STATUS.PUBLISHED, APPROVAL_STATUS.DRAFT],
    [APPROVAL_STATUS.REJECTED]: [APPROVAL_STATUS.DRAFT],
    [APPROVAL_STATUS.PUBLISHED]: [APPROVAL_STATUS.DRAFT] 
};
