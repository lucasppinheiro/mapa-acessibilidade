import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro inesperado na interface:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <main id="conteudo-principal" tabIndex="-1" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-slate-950">Algo deu errado</h1>
            <p className="mt-2 text-slate-700">Ocorreu um erro inesperado. Tente recarregar a página.</p>
            <button type="button" onClick={() => window.location.reload()} className="button-primary mt-5">Recarregar página</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
