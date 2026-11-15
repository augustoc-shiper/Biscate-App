import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import Splash from './components/Splash';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/app/Home';
import Placeholder from './pages/app/Placeholder';
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
            <Route path="chat" element={<Placeholder title="Mensagens" />} />
            <Route
              path="chat/:id"
              element={<Placeholder title="Conversa" />}
            />
            <Route
              path="requests"
              element={<Placeholder title="Pedidos" />}
            />
            <Route path="plans" element={<Placeholder title="Planos" />} />
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
