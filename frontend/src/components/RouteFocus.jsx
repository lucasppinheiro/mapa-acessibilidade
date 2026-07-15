import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TITULOS = {
  '/': 'Locais acessíveis',
  '/login': 'Entrar ou criar conta',
  '/novo-local': 'Cadastrar local',
  '/privacidade': 'Privacidade',
  '/conta': 'Minha conta',
  '/moderacao': 'Fila de moderação'
};

const estaDisponivel = (elemento) => {
  if (!elemento?.isConnected) return false;
  let atual = elemento;
  while (atual) {
    if (atual.hidden || atual.getAttribute?.('aria-hidden') === 'true') return false;
    const estilo = window.getComputedStyle(atual);
    if (estilo.display === 'none' || estilo.visibility === 'hidden') return false;
    atual = atual.parentElement;
  }
  return true;
};

const principalFinalDisponivel = () => (
  [...document.querySelectorAll('#conteudo-principal:not([data-route-loading])')].find(estaDisponivel)
);

export default function RouteFocus() {
  const { pathname } = useLocation();
  const pathnameAnterior = useRef(pathname);

  useEffect(() => {
    const titulo = pathname.startsWith('/local/') ? 'Detalhes do local' : (TITULOS[pathname] || 'Página');
    document.title = `${titulo} | AcessaMapa`;

    const houveNavegacao = pathnameAnterior.current !== pathname;
    pathnameAnterior.current = pathname;
    const fallbackInicial = document.querySelector('#conteudo-principal[data-route-loading]');
    let focoSolicitadoNoFallback = document.activeElement === fallbackInicial;
    const registrarFocoNoFallback = () => { focoSolicitadoNoFallback = true; };

    if (!houveNavegacao && !fallbackInicial) return undefined;
    fallbackInicial?.addEventListener('focus', registrarFocoNoFallback);

    const focarConteudo = () => {
      const principal = principalFinalDisponivel();
      if (!principal) return false;
      if (houveNavegacao || focoSolicitadoNoFallback) {
        principal.focus({ preventScroll: true });
        if (document.activeElement !== principal) return false;
      }
      return true;
    };

    if (focarConteudo()) {
      fallbackInicial?.removeEventListener('focus', registrarFocoNoFallback);
      return undefined;
    }

    const observer = new MutationObserver(() => {
      if (focarConteudo()) observer.disconnect();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'style', 'aria-hidden']
    });
    return () => {
      fallbackInicial?.removeEventListener('focus', registrarFocoNoFallback);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
