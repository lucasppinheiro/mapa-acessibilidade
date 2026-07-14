import { useEffect, useRef, useState } from 'react';
import { FiLogIn, FiLogOut, FiMap, FiMenu, FiPlus, FiShield, FiUser, FiX } from 'react-icons/fi';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const classeLink = ({ isActive }) => [
  'nav-link',
  isActive ? 'nav-link-active' : ''
].join(' ');

export default function Navbar() {
  const { autenticado, logout, podeModerar, usuario } = useAuth();
  const [aberto, setAberto] = useState(false);
  const botaoMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharComEscape = (event) => {
      if (event.key === 'Escape') {
        setAberto(false);
        botaoMenuRef.current?.focus();
      }
    };
    document.addEventListener('keydown', fecharComEscape);
    return () => document.removeEventListener('keydown', fecharComEscape);
  }, [aberto]);

  const sair = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-blue-900 text-white shadow-md">
      <nav className="mx-auto max-w-7xl px-4" aria-label="Navegação principal">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Link to="/" onClick={() => setAberto(false)} className="inline-flex min-h-11 items-center gap-2 rounded-md text-xl font-bold" aria-label="AcessaMapa, página inicial">
            <FiMap className="text-2xl" aria-hidden="true" />
            AcessaMapa
          </Link>
          <button
            ref={botaoMenuRef}
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-blue-600 md:hidden"
            aria-expanded={aberto}
            aria-controls="menu-principal"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setAberto((valor) => !valor)}
          >
            {aberto ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>
          <div id="menu-principal" className={`${aberto ? 'flex' : 'hidden'} absolute left-0 right-0 top-16 z-[1100] flex-col gap-1 bg-blue-900 p-4 shadow-lg md:static md:flex md:flex-row md:items-center md:bg-transparent md:p-0 md:shadow-none`}>
            <NavLink to="/" end className={classeLink} onClick={() => setAberto(false)}>Locais</NavLink>
            <NavLink to="/privacidade" className={classeLink} onClick={() => setAberto(false)}>Privacidade</NavLink>
            {autenticado && (
              <NavLink to="/novo-local" className={classeLink} onClick={() => setAberto(false)}>
                <FiPlus aria-hidden="true" /> Cadastrar local
              </NavLink>
            )}
            {podeModerar && (
              <NavLink to="/moderacao" className={classeLink} onClick={() => setAberto(false)}>
                <FiShield aria-hidden="true" /> Moderação
              </NavLink>
            )}
            {autenticado ? (
              <>
                <NavLink to="/conta" className={classeLink} aria-label={`Conta de ${usuario?.nome}`} onClick={() => setAberto(false)}>
                  <FiUser aria-hidden="true" /> Conta
                </NavLink>
                <button type="button" onClick={sair} className="nav-link text-left">
                  <FiLogOut aria-hidden="true" /> Sair
                </button>
              </>
            ) : (
              <NavLink to="/login" className={classeLink} onClick={() => setAberto(false)}>
                <FiLogIn aria-hidden="true" /> Entrar
              </NavLink>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
