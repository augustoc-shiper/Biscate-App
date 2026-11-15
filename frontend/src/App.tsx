import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import Splash from './components/Splash';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/app/Home';
import ChatList from './pages/app/ChatList';
import ChatRoom from './pages/app/ChatRoom';
import Dashboard from './pages/app/Dashboard';
import Me from './pages/app/Me';
import NewRequest from './pages/app/NewRequest';
import EditProfile from './pages/app/EditProfile';
import Notifications from './pages/app/Notifications';
import Payment from './pages/app/Payment';
import Plans from './pages/app/Plans';
import Requests from './pages/app/Requests';
import Profile from './pages/app/Profile';
import Search from './pages/app/Search';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      </AnimatePresence>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="professional/:id" element={<Profile />} />
            <Route path="chat" element={<ChatList />} />
            <Route path="chat/:id" element={<ChatRoom />} />
            <Route path="requests" element={<Requests />} />
            <Route path="requests/nova" element={<NewRequest />} />
            <Route path="plans" element={<Plans />} />
            <Route path="plans/pagamento" element={<Payment />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="me" element={<Me />} />
            <Route path="me/editar" element={<EditProfile />} />
            <Route path="notificacoes" element={<Notifications />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
