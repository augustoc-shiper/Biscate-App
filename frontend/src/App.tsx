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
import NewRequest from './pages/app/NewRequest';
import Payment from './pages/app/Payment';
import Plans from './pages/app/Plans';
import Placeholder from './pages/app/Placeholder';
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
            <Route
              path="dashboard"
              element={<Placeholder title="Painel" />}
            />
            <Route path="me" element={<Placeholder title="Perfil" />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
