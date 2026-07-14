import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITULOS = {
  '/': 'Locais acessíveis',
  '/login': 'Entrar ou criar conta',
  '/novo-local': 'Cadastrar local',
  '/privacidade': 'Privacidade',
  '/conta': 'Minha conta',
  '/moderacao': 'Fila de moderação'
};

export default function RouteFocus() {
  const { pathname } = useLocation();

  useEffect(() => {
    const titulo = pathname.startsWith('/local/') ? 'Detalhes do local' : (TITULOS[pathname] || 'Página');
    document.title = `${titulo} | AcessaMapa`;
    const principal = document.getElementById('conteudo-principal');
    principal?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
