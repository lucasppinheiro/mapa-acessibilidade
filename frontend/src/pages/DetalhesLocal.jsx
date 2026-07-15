import { useCallback, useEffect, useRef, useState } from 'react';
import { FiArchive, FiClock, FiSend, FiUser } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DenunciaForm from '../components/DenunciaForm';
import InlineError from '../components/InlineError';
import MapaSobDemanda from '../components/MapaSobDemanda';
import { CategoriaBadge, RecursosFieldset } from '../components/RecursosInfo';
import StarRating from '../components/StarRating';
import { ESTADOS_RECURSO, RECURSOS, recursosDesconhecidos } from '../constants';
import { useAuth } from '../context/useAuth';
import {
  arquivarAvaliacao,
  arquivarLocal,
  criarAvaliacao,
  extrairMensagemErro,
  listarAvaliacoes,
  obterLocal
} from '../services/api';
import { autorDe, coordenadasDe, dataFormatada, estadoRecursoDe, idDe, mediaDe, totalAvaliacoesDe } from '../utils/domain';

const LIMITE = 10;

export default function DetalhesLocal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { autenticado, usuario, podeModerar } = useAuth();
  const formRef = useRef(null);
  const [local, setLocal] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [avaliacao, setAvaliacao] = useState({ nota: null, comentario: '', observacoesRecursos: recursosDesconhecidos() });
  const [errosForm, setErrosForm] = useState({});
  const [erroForm, setErroForm] = useState('');
  const [mapaAberto, setMapaAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [respostaLocal, respostaAvaliacoes] = await Promise.all([
        obterLocal(id),
        listarAvaliacoes(id, { pagina: 1, limite: LIMITE })
      ]);
      setLocal(respostaLocal.data.local || respostaLocal.data);
      setAvaliacoes(respostaAvaliacoes.data.avaliacoes || []);
      setPaginacao(respostaAvaliacoes.data.paginacao || null);
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível carregar este local.'));
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const enviarAvaliacao = async (event) => {
    event.preventDefault();
    const novosErros = {};
    if (!avaliacao.nota) novosErros.nota = 'Selecione uma nota de 1 a 5.';
    if (avaliacao.comentario.trim().length < 10) novosErros.comentario = 'Escreva pelo menos 10 caracteres.';
    setErrosForm(novosErros);
    setErroForm('');
    if (Object.keys(novosErros).length) {
      requestAnimationFrame(() => {
        const primeiro = novosErros.nota
          ? formRef.current?.querySelector('input[name="nota-avaliacao"]')
          : formRef.current?.querySelector('[aria-invalid="true"]');
        primeiro?.focus();
      });
      return;
    }
    setEnviando(true);
    try {
      await criarAvaliacao(id, {
        nota: avaliacao.nota,
        comentario: avaliacao.comentario.trim(),
        observacoesRecursos: avaliacao.observacoesRecursos
      });
      setAvaliacao({ nota: null, comentario: '', observacoesRecursos: recursosDesconhecidos() });
      toast.success('Avaliação enviada para moderação.');
    } catch (error) {
      setErroForm(extrairMensagemErro(error, 'Não foi possível enviar a avaliação.'));
    } finally {
      setEnviando(false);
    }
  };

  const carregarMais = async () => {
    setCarregandoMais(true);
    try {
      const { data } = await listarAvaliacoes(id, { pagina: paginacao.pagina + 1, limite: LIMITE });
      setAvaliacoes((atuais) => [...atuais, ...(data.avaliacoes || [])]);
      setPaginacao(data.paginacao);
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível carregar mais avaliações.'));
    } finally {
      setCarregandoMais(false);
    }
  };

  const arquivarEsteLocal = async () => {
    if (!window.confirm('Arquivar este local? O histórico será preservado.')) return;
    try {
      await arquivarLocal(id);
      toast.success('Local arquivado.');
      navigate('/');
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível arquivar o local.'));
    }
  };

  const arquivarEstaAvaliacao = async (avaliacaoId) => {
    if (!window.confirm('Arquivar esta avaliação? O histórico será preservado.')) return;
    try {
      await arquivarAvaliacao(id, avaliacaoId);
      setAvaliacoes((atuais) => atuais.filter((item) => idDe(item) !== avaliacaoId));
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível arquivar a avaliação.'));
    }
  };

  if (carregando) return <main id="conteudo-principal" tabIndex="-1" className="mx-auto max-w-5xl px-4 py-10"><p role="status">Carregando detalhes do local...</p></main>;
  if (erro && !local) return <main id="conteudo-principal" tabIndex="-1" className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-2xl font-bold">Local indisponível</h1><p role="alert" className="mt-3">{erro}</p><Link className="mt-4 inline-block font-semibold text-blue-800 underline" to="/">Voltar aos locais</Link></main>;
  if (!local) return null;

  const media = mediaDe(local);
  const total = totalAvaliacoesDe(local);
  const autor = autorDe(local);
  const isAutor = idDe(autor) === idDe(usuario);
  const coordenadas = coordenadasDe(local);

  return (
    <main id="conteudo-principal" tabIndex="-1" aria-labelledby="titulo-pagina" className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {erro && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">{erro}</p>}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 id="titulo-pagina" className="text-3xl font-bold text-slate-950">{local.nome}</h1>
            <p className="mt-1 text-slate-700">{local.endereco}</p>
          </div>
          {(isAutor || podeModerar) && <button type="button" className="button-danger" onClick={arquivarEsteLocal}><FiArchive aria-hidden="true" /> Arquivar local</button>}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <section className="card" aria-labelledby="titulo-resumo">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 id="titulo-resumo" className="text-xl font-semibold">Resumo</h2><div className="mt-2"><StarRating nota={media} somenteLeitura /></div><p className="mt-1 text-sm text-slate-600">{total ? `${total} avaliações aprovadas` : 'Ainda não avaliado'}</p></div>
                <CategoriaBadge categoria={local.categoria} />
              </div>
              <p className="mt-4 text-slate-800">{local.descricao}</p>
              <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600"><FiClock className="mr-1 inline" aria-hidden="true" /> Informado por {autor?.nome || 'pessoa da comunidade'} em {dataFormatada(local.criadoEm || local.createdAt)}.</p>
              <DenunciaForm alvoTipo="local" alvoId={idDe(local)} />
            </section>

            <section className="card" aria-labelledby="titulo-recursos">
              <h2 id="titulo-recursos" className="text-xl font-semibold">Recursos e verificações</h2>
              <p className="mt-1 text-sm text-slate-700">“Informado” descreve o cadastro original; confirmações e contestações vêm de avaliações aprovadas.</p>
              <dl className="mt-4 divide-y divide-slate-200">
                {Object.entries(RECURSOS).map(([chave, info]) => {
                  const resumo = local.resumoRecursos?.[chave] || { informado: estadoRecursoDe(local.recursos?.[chave]), confirmacoes: 0, contestacoes: 0, ultimaVerificacao: null };
                  return (
                    <div key={chave} className="grid gap-1 py-3 sm:grid-cols-[13rem_1fr]">
                      <dt className="font-semibold text-slate-900">{info.label}</dt>
                      <dd className="text-sm text-slate-700">
                        Informado: {ESTADOS_RECURSO[estadoRecursoDe(resumo.informado)]}. {resumo.confirmacoes || 0} confirmações; {resumo.contestacoes || 0} contestações. Última verificação: {dataFormatada(resumo.ultimaVerificacao)}.
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section aria-labelledby="titulo-avaliacoes">
              <h2 id="titulo-avaliacoes" className="text-2xl font-bold">Avaliações aprovadas</h2>
              {autenticado ? (
                <form ref={formRef} noValidate onSubmit={enviarAvaliacao} className="card mt-4 space-y-4">
                  <h3 className="text-lg font-semibold">Enviar avaliação</h3>
                  {erroForm && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{erroForm}</p>}
                  <div className={errosForm.nota ? 'rounded-md border border-red-500 p-2' : ''}>
                    <StarRating nome="nota-avaliacao" nota={avaliacao.nota} onChange={(nota) => setAvaliacao({ ...avaliacao, nota })} erroId={errosForm.nota ? 'erro-nota' : undefined} obrigatorio />
                    {errosForm.nota && <p id="erro-nota" className="mt-1 text-sm font-medium text-red-800">{errosForm.nota}</p>}
                  </div>
                  <div>
                    <label htmlFor="comentario" className="label">Comentário</label>
                    <textarea id="comentario" className="input min-h-28" maxLength="1000" value={avaliacao.comentario} onChange={(event) => setAvaliacao({ ...avaliacao, comentario: event.target.value })} aria-invalid={Boolean(errosForm.comentario)} aria-describedby={errosForm.comentario ? 'erro-comentario' : undefined} />
                    <InlineError id="erro-comentario">{errosForm.comentario}</InlineError>
                  </div>
                  <RecursosFieldset legenda="O que você observou nos recursos?" valores={avaliacao.observacoesRecursos} onChange={(recurso, estado) => setAvaliacao((atual) => ({ ...atual, observacoesRecursos: { ...atual.observacoesRecursos, [recurso]: estado } }))} />
                  <button type="submit" className="button-primary" disabled={enviando}><FiSend aria-hidden="true" /> {enviando ? 'Enviando...' : 'Enviar para moderação'}</button>
                </form>
              ) : <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4"><Link className="font-semibold text-blue-900 underline" to="/login" state={{ destino: `/local/${id}` }}>Entre na sua conta</Link> para avaliar.</p>}

              <div className="mt-5 space-y-4">
                {avaliacoes.map((item) => {
                  const avaliacaoId = idDe(item);
                  const autorAvaliacao = autorDe(item);
                  const podeArquivar = idDe(autorAvaliacao) === idDe(usuario) || podeModerar;
                  return (
                    <article key={avaliacaoId} className="card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="font-semibold"><FiUser className="mr-1 inline" aria-hidden="true" />{autorAvaliacao?.nome || 'Pessoa da comunidade'}</p><p className="text-sm text-slate-600">{dataFormatada(item.criadoEm || item.createdAt)}</p></div>
                        <StarRating nota={item.nota} somenteLeitura tamanho="text-sm" />
                      </div>
                      <p className="mt-3 text-slate-800">{item.comentario}</p>
                      <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Observações sobre recursos</summary><ul className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">{Object.entries(RECURSOS).map(([chave, info]) => <li key={chave}>{info.label}: {ESTADOS_RECURSO[estadoRecursoDe(item.observacoesRecursos?.[chave])]}</li>)}</ul></details>
                      <DenunciaForm alvoTipo="avaliacao" alvoId={avaliacaoId} />
                      {podeArquivar && <button type="button" className="button-quiet mt-3" onClick={() => arquivarEstaAvaliacao(avaliacaoId)}><FiArchive aria-hidden="true" /> Arquivar avaliação</button>}
                    </article>
                  );
                })}
                {!avaliacoes.length && <p className="card text-center text-slate-700">Ainda não há avaliações aprovadas.</p>}
                {paginacao?.temProximaPagina && <button type="button" className="button-secondary" onClick={carregarMais} disabled={carregandoMais}>{carregandoMais ? 'Carregando...' : 'Carregar mais avaliações'}</button>}
              </div>
            </section>
          </div>

          <aside className="space-y-4" aria-label="Localização do local">
            <div className="card"><h2 className="text-lg font-semibold">Coordenadas</h2>{coordenadas ? <p className="mt-2 text-sm">Latitude {coordenadas.lat.toFixed(6)}; longitude {coordenadas.lng.toFixed(6)}.</p> : <p>Coordenadas não disponíveis.</p>}</div>
            {coordenadas && <details className="card" onToggle={(event) => setMapaAberto(event.currentTarget.open)}><summary className="cursor-pointer font-semibold">Ver no mapa (opcional)</summary><div className="mt-3 h-72"><MapaSobDemanda ativo={mapaAberto} locais={[local]} centroInicial={[coordenadas.lat, coordenadas.lng]} titulo={`Mapa de ${local.nome}`} /></div></details>}
          </aside>
        </div>
      </div>
    </main>
  );
}
