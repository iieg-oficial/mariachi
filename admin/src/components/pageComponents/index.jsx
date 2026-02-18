import Carousel from './Carousel'
import { BLOCK_TYPES } from '@constants/pageConstants'

export const BLOCK_COMPONENT_MAP = {
    [BLOCK_TYPES.CAROUSEL]: Carousel,
}

export const getBlockComponent = (type) => {
    return BLOCK_COMPONENT_MAP[type] || (() => <div style={{ padding: 16, color: '#999' }}>Componente no encontrado: {type}</div>)
}
