import {
  Home,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Tag,
  User,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './TabBar.css';

type TabDef = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const CLIENT_TABS: TabDef[] = [
  { to: '/app', label: 'Início', icon: Home, end: true },
  { to: '/app/chat', label: 'Mensagens', icon: MessageCircle },
  { to: '/app/requests', label: 'Pedidos', icon: ListTodo },
  { to: '/app/me', label: 'Perfil', icon: User },
];

const PROFESSIONAL_TABS: TabDef[] = [
  { to: '/app/dashboard', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/app/chat', label: 'Mensagens', icon: MessageCircle },
  { to: '/app/plans', label: 'Plano', icon: Tag },
  { to: '/app/me', label: 'Perfil', icon: User },
];

export default function TabBar() {
  const { user } = useAuth();
  const tabs = user?.role === 'professional'
    ? PROFESSIONAL_TABS
    : CLIENT_TABS;

  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            isActive ? 'tabbar-item active' : 'tabbar-item'
          }
        >
          <Icon size={22} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
