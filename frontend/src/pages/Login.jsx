import { useRef, useState } from 'react';
import { FiLogIn } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import InlineError from '../components/InlineError';
import { useAuth } from '../context/useAuth';
import { extrairMensagemErro } from '../services/api';
import { errosDeCampos } from '../utils/domain';

const validar = (form, modo) => {
  const erros = {};
  if (modo === 'registro' && form.nome.trim().length < 2) erros.nome = 'Informe um nome com pelo menos 2 caracteres.';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) erros.email = 'Informe um e-mail válido.';
  if (form.senha.length < 8 || form.senha.length > 128) erros.senha = 'A senha deve ter entre 8 e 128 caracteres.';
  else if (modo === 'registro' && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.senha)) erros.senha = 'Use pelo menos uma letra maiúscula, uma minúscula e um número.';
  return erros;
};

export default function Login() {
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);
  const formularioRef = useRef(null);
  const { login, registrar } = useAuth();
  const navigate = useNavigate();

  const mudarModo = (novoModo) => {
    setModo(novoModo);
    setErros({});
    setErroGeral('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const novosErros = validar(form, modo);
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length) {
      requestAnimationFrame(() => formularioRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    setCarregando(true);
    try {
      if (modo === 'login') await login(form.email, form.senha);
      else await registrar(form);
      navigate('/');
    } catch (error) {
      const errosApi = errosDeCampos(error);
      if (Object.keys(errosApi).length) {
        setErros(errosApi);
        requestAnimationFrame(() => formularioRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      } else {
        setErroGeral(extrairMensagemErro(error, 'Não foi possível autenticar. Confira os dados e tente novamente.'));
      }
    } finally {
      setCarregando(false);
    }
  };

  const campo = (nome, valor) => setForm((atual) => ({ ...atual, [nome]: valor }));

  return (
    <main id="conteudo-principal" tabIndex="-1" aria-labelledby="titulo-pagina" className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 id="titulo-pagina" className="text-3xl font-bold text-slate-950">{modo === 'login' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="mt-2 text-slate-700">
          {modo === 'login' ? 'Entre para cadastrar e avaliar locais.' : 'Crie uma conta sem informar dados sobre deficiência.'}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-lg border border-slate-300 bg-slate-100 p-1" aria-label="Escolha do formulário">
          <button type="button" className={`mode-button ${modo === 'login' ? 'mode-button-active' : ''}`} aria-pressed={modo === 'login'} onClick={() => mudarModo('login')}>Entrar</button>
          <button type="button" className={`mode-button ${modo === 'registro' ? 'mode-button-active' : ''}`} aria-pressed={modo === 'registro'} onClick={() => mudarModo('registro')}>Criar conta</button>
        </div>

        <form ref={formularioRef} noValidate onSubmit={handleSubmit} className="card mt-4 space-y-4">
          {erroGeral && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{erroGeral}</p>}

          {modo === 'registro' && (
            <div>
              <label htmlFor="nome" className="label">Nome</label>
              <input id="nome" name="nome" required autoComplete="name" className="input" value={form.nome} onChange={(event) => campo('nome', event.target.value)} aria-invalid={Boolean(erros.nome)} aria-describedby={erros.nome ? 'erro-nome' : undefined} />
              <InlineError id="erro-nome">{erros.nome}</InlineError>
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={(event) => campo('email', event.target.value)} aria-invalid={Boolean(erros.email)} aria-describedby={erros.email ? 'erro-email' : undefined} />
            <InlineError id="erro-email">{erros.email}</InlineError>
          </div>

          <div>
            <label htmlFor="senha" className="label">Senha</label>
            <input id="senha" name="senha" type="password" required minLength="8" maxLength="128" autoComplete={modo === 'login' ? 'current-password' : 'new-password'} className="input" value={form.senha} onChange={(event) => campo('senha', event.target.value)} aria-invalid={Boolean(erros.senha)} aria-describedby="ajuda-senha erro-senha" />
            <p id="ajuda-senha" className="mt-1 text-sm text-slate-600">Use de 8 a 128 caracteres; no cadastro, inclua maiúscula, minúscula e número.</p>
            <InlineError id="erro-senha">{erros.senha}</InlineError>
          </div>

          <button type="submit" className="button-primary w-full" disabled={carregando}>
            <FiLogIn aria-hidden="true" /> {carregando ? 'Processando...' : (modo === 'login' ? 'Entrar' : 'Criar conta')}
          </button>
        </form>
      </div>
    </main>
  );
}
