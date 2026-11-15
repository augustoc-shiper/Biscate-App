import { Bell } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import TabBar from './TabBar';
import './AppShell.css';

export default function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/app" className="app-logo">
          bis<span>kato</span>
        </Link>
        <Link to="/app/me" aria-label="Notificações" className="app-bell">
          <Bell size={22} aria-hidden="true" />
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
