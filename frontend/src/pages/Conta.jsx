import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InlineError from '../components/InlineError';
import { useAuth } from '../context/useAuth';

export default function Conta() {
  const { excluirConta, logoutTodas, usuario } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState({});
  const [mensagem, setMensagem] = useState('');
  const [processando, setProcessando] = useState(false);

  const encerrarTodas = async () => {
    setProcessando(true);
    try {
      await logoutTodas();
      navigate('/login');
    } catch {
      setMensagem('Não foi possível confirmar o encerramento no servidor. A sessão deste navegador foi encerrada.');
    } finally {
      setProcessando(false);
    }
  };

  const excluir = async (event) => {
    event.preventDefault();
    const novosErros = {};
    if (!senha) novosErros.senha = 'Informe sua senha atual.';
    if (confirmacao !== 'EXCLUIR') novosErros.confirmacao = 'Digite EXCLUIR em letras maiúsculas.';
    setErros(novosErros);
    setMensagem('');
    if (Object.keys(novosErros).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setProcessando(true);
    try {
      await excluirConta({ senha, confirmacao });
      navigate('/');
    } catch (error) {
      setMensagem(error.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <main id="conteudo-principal" tabIndex="-1" aria-labelledby="titulo-pagina" className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div><h1 id="titulo-pagina" className="text-3xl font-bold">Minha conta</h1><p className="mt-2 text-slate-700">Sessão de {usuario?.nome}.</p>{mensagem && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{mensagem}</p>}</div>

        <section className="card" aria-labelledby="titulo-sessoes">
          <h2 id="titulo-sessoes" className="text-xl font-semibold">Sessões ativas</h2>
          <p className="mt-2">Encerre todas as sessões se você perdeu um dispositivo ou suspeita de acesso indevido.</p>
          <button type="button" className="button-secondary mt-4" onClick={encerrarTodas} disabled={processando}>Encerrar todas as sessões</button>
        </section>

        <section className="card border-red-300" aria-labelledby="titulo-exclusao">
          <h2 id="titulo-exclusao" className="text-xl font-semibold text-red-900">Excluir conta</h2>
          <p className="mt-2">A conta será anonimizada. As contribuições permanecem sem seus dados pessoais para preservar o histórico comunitário.</p>
          <form ref={formRef} noValidate onSubmit={excluir} className="mt-4 space-y-4">
            <div>
              <label htmlFor="senha-exclusao" className="label">Senha atual</label>
              <input id="senha-exclusao" type="password" autoComplete="current-password" className="input" value={senha} onChange={(event) => setSenha(event.target.value)} aria-invalid={Boolean(erros.senha)} aria-describedby={erros.senha ? 'erro-senha-exclusao' : undefined} />
              <InlineError id="erro-senha-exclusao">{erros.senha}</InlineError>
            </div>
            <div>
              <label htmlFor="confirmacao-exclusao" className="label">Digite EXCLUIR para confirmar</label>
              <input id="confirmacao-exclusao" className="input" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} aria-invalid={Boolean(erros.confirmacao)} aria-describedby={erros.confirmacao ? 'erro-confirmacao-exclusao' : undefined} />
              <InlineError id="erro-confirmacao-exclusao">{erros.confirmacao}</InlineError>
            </div>
            <button type="submit" className="button-danger" disabled={processando}>Excluir e anonimizar conta</button>
          </form>
        </section>
      </div>
    </main>
  );
}
