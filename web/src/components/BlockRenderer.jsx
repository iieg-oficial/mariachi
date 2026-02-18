import Carousel from './pageComponents/Carousel'

const COMPONENT_MAP = {
    'carousel': Carousel,
}

export default function BlockRenderer({ block }) {
    if (!block || !block.type) return null

    const Component = COMPONENT_MAP[block.type]

    if (!Component) {
        console.warn(`Unknown block type: ${block.type}`)
        return null
    }

    return <Component {...block.props} />
}
