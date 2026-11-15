import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import Splash from './components/Splash';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Placeholder from './pages/app/Placeholder';

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
            <Route index element={<Placeholder title="Início" />} />
            <Route path="search" element={<Placeholder title="Pesquisa" />} />
            <Route
              path="professional/:id"
              element={<Placeholder title="Perfil do profissional" />}
            />
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
