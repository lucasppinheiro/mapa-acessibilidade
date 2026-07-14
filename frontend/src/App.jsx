import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import RouteFocus from './components/RouteFocus';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Conta from './pages/Conta';
import DetalhesLocal from './pages/DetalhesLocal';
import Home from './pages/Home';
import Login from './pages/Login';
import Moderacao from './pages/Moderacao';
import NovoLocal from './pages/NovoLocal';
import Privacidade from './pages/Privacidade';

function CarregandoPagina() {
  return (
    <main id="conteudo-principal" tabIndex="-1" className="mx-auto max-w-7xl px-4 py-12">
      <p role="status">Verificando sua sessão...</p>
    </main>
  );
}

function RotaPrivada({ children, moderacao = false }) {
  const { autenticado, carregando, podeModerar } = useAuth();
  if (carregando) return <CarregandoPagina />;
  if (!autenticado) return <Navigate to="/login" replace />;
  if (moderacao && !podeModerar) return <Navigate to="/" replace />;
  return children;
}

function NaoEncontrada() {
  return (
    <main id="conteudo-principal" tabIndex="-1" className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-3">O endereço informado não existe.</p>
      <a className="mt-4 inline-block font-semibold text-blue-800 underline" href="/">Voltar aos locais</a>
    </main>
  );
}

function Conteudo() {
  return (
    <>
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>
      <Navbar />
      <RouteFocus />
      <Toaster
        position="top-right"
        toastOptions={{ duration: 5000, ariaProps: { role: 'status', 'aria-live': 'polite' } }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/local/:id" element={<DetalhesLocal />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/novo-local" element={<RotaPrivada><NovoLocal /></RotaPrivada>} />
        <Route path="/conta" element={<RotaPrivada><Conta /></RotaPrivada>} />
        <Route path="/moderacao" element={<RotaPrivada moderacao><Moderacao /></RotaPrivada>} />
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Conteudo />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
