import { Menu } from 'antd';
import { useNavigate } from 'react-router';
import {
    HomeOutlined, UserOutlined, SettingOutlined, FileOutlined,
    FolderOutlined, BookOutlined, InfoCircleOutlined, MailOutlined,
    PhoneOutlined, ShoppingOutlined, TeamOutlined, DatabaseOutlined,
    CloudOutlined, BarChartOutlined, PieChartOutlined, LineChartOutlined,
    AppstoreOutlined, DashboardOutlined, CalendarOutlined, BellOutlined
} from '@ant-design/icons';

const getIconComponent = (iconName) => {
    const iconMap = {
        HomeOutlined, UserOutlined, TeamOutlined, SettingOutlined,
        FileOutlined, FolderOutlined, BookOutlined, InfoCircleOutlined,
        MailOutlined, PhoneOutlined, ShoppingOutlined, DatabaseOutlined,
        CloudOutlined, BarChartOutlined, PieChartOutlined, LineChartOutlined,
        AppstoreOutlined, DashboardOutlined, CalendarOutlined, BellOutlined
    };
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent /> : null;
};

export default function NavigationMenu({ items = [], customIcons = [], style = {} }) {
    const navigate = useNavigate();

    const buildMenuItems = (menuItems, level = 1) => {
        return menuItems.map(item => {
            const hasChildren = item.children && item.children.length > 0;

            let icon = null;
            if (item.iconId) {
                const customIcon = customIcons.find(icon => icon.id === item.iconId);
                if (customIcon) {
                    icon = <span dangerouslySetInnerHTML={{ __html: customIcon.svg }} />;
                }
            } else if (item.icon) {
                const IconComponent = getIconComponent(item.icon);
                icon = IconComponent ? <IconComponent /> : null;
            }

            if (hasChildren) {
                return {
                    key: item.id,
                    label: item.label,
                    icon,
                    children: buildMenuItems(item.children, level + 1)
                };
            }

            return {
                key: item.id,
                label: item.label,
                icon,
                onClick: () => {
                    if (item.url) {
                        if (item.external) {
                            window.open(item.url, '_blank');
                        } else {
                            navigate(item.url);
                        }
                    }
                }
            };
        });
    };

    const menuConfig = buildMenuItems(items);

    return (
        <Menu
            mode="horizontal"
            items={menuConfig}
            style={{
                border: 'none',
                background: 'transparent',
                ...style
            }}
        />
    );
}
