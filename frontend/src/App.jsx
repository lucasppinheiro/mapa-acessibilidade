import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, BrowserRouter, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import RouteFocus from './components/RouteFocus';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { estadoRetornoSeguro } from './utils/navigation';
const Conta = lazy(() => import('./pages/Conta'));
const DetalhesLocal = lazy(() => import('./pages/DetalhesLocal'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Moderacao = lazy(() => import('./pages/Moderacao'));
const NovoLocal = lazy(() => import('./pages/NovoLocal'));
const Privacidade = lazy(() => import('./pages/Privacidade'));

function CarregandoPagina({ mensagem = 'Carregando página...' }) {
  return (
    <main id="conteudo-principal" data-route-loading tabIndex="-1" aria-busy="true" className="mx-auto max-w-7xl px-4 py-12">
      <p role="status">{mensagem}</p>
    </main>
  );
}

function RotaPrivada({ children, moderacao = false }) {
  const { autenticado, carregando, podeModerar } = useAuth();
  const location = useLocation();
  if (carregando) return <CarregandoPagina mensagem="Verificando sua sessão..." />;
  if (!autenticado) {
    const state = estadoRetornoSeguro({
      destino: location.pathname,
      preenchimentoLocal: location.state?.preenchimentoLocal
    });
    return <Navigate to="/login" replace state={state} />;
  }
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
      <Suspense fallback={<CarregandoPagina />}>
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
      </Suspense>
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
