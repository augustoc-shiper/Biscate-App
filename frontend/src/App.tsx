import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ChatList from './pages/ChatList';
import ChatRoom from './pages/ChatRoom';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Me from './pages/Me';
import Plans from './pages/Plans';
import Professional from './pages/Professional';
import Requests from './pages/Requests';
import Search from './pages/Search';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Home />} />
        <Route path="/app/search" element={<Search />} />
        <Route path="/app/professional/:id" element={<Professional />} />
        <Route path="/app/chat" element={<ChatList />} />
        <Route path="/app/chat/:id" element={<ChatRoom />} />
        <Route path="/app/requests" element={<Requests />} />
        <Route path="/app/plans" element={<Plans />} />
        <Route path="/app/dashboard" element={<Dashboard />} />
        <Route path="/app/me" element={<Me />} />
      </Route>
    </Routes>
  );
}
