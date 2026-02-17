import Banner from './home/Banner'
import UpdatesSlider from './home/UpdatesSlider'
import RecentInfo from './home/RecentInfo'
import SistemasInfo from './home/SistemasInfo'

const COMPONENT_MAP = {
    'home-hero': Banner,
    'home-updates-slider': UpdatesSlider,
    'home-recent-info': RecentInfo,
    'home-sistemas': SistemasInfo
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
