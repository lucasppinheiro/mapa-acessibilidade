import { useCallback, useEffect, useRef, useState } from 'react';
import { FiFilter, FiList, FiMap, FiSearch, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import MapaSobDemanda from '../components/MapaSobDemanda';
import { CategoriaBadge, RecursoBadge } from '../components/RecursosInfo';
import StarRating from '../components/StarRating';
import { CATEGORIAS, RECURSOS } from '../constants';
import { buscarEndereco, extrairMensagemErro, listarLocais } from '../services/api';
import { idDe, mediaDe, totalAvaliacoesDe } from '../utils/domain';
import {
  normalizarResultadosGeocodificacao,
  preenchimentoDeResultadoGeocodificacao
} from '../utils/navigation';

const extrairLocais = (data) => data.locais || data.itens || data.dados || (Array.isArray(data) ? data : []);

export default function Home() {
  const [locais, setLocais] = useState([]);
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 1, temProximaPagina: false });
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [filtros, setFiltros] = useState({ categoria: '', recurso: '', notaMinima: '' });
  const [painelFiltros, setPainelFiltros] = useState(false);
  const [visualizacao, setVisualizacao] = useState('lista');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [resultadosEndereco, setResultadosEndereco] = useState([]);
  const [buscaEnderecoRealizada, setBuscaEnderecoRealizada] = useState(false);
  const [buscandoEnderecos, setBuscandoEnderecos] = useState(false);
  const [mensagemEnderecos, setMensagemEnderecos] = useState('');
  const [erroEnderecos, setErroEnderecos] = useState('');
  const [atribuicaoEnderecos, setAtribuicaoEnderecos] = useState('© OpenStreetMap contributors');
  const statusResultadosRef = useRef(null);
  const buscaEnderecoAtualRef = useRef(0);

  const carregarLocais = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filtros, busca: buscaAplicada, pagina, limite: 20 }).filter(([, valor]) => valor !== '')
      );
      const { data } = await listarLocais(params);
      const novosLocais = extrairLocais(data);
      setLocais(novosLocais);
      setPaginacao(data.paginacao || { pagina, total: novosLocais.length, totalPaginas: 1, temProximaPagina: false });
      if (novosLocais.length === 0) setVisualizacao('lista');
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível carregar os locais. Tente novamente.'));
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, filtros, pagina]);

  useEffect(() => { carregarLocais(); }, [carregarLocais]);

  const limparBuscaEnderecos = () => {
    buscaEnderecoAtualRef.current += 1;
    setResultadosEndereco([]);
    setBuscaEnderecoRealizada(false);
    setBuscandoEnderecos(false);
    setMensagemEnderecos('');
    setErroEnderecos('');
  };

  const pesquisar = (event) => {
    event.preventDefault();
    limparBuscaEnderecos();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  };

  const limparFiltros = () => {
    setFiltros({ categoria: '', recurso: '', notaMinima: '' });
    setBusca('');
    setBuscaAplicada('');
    setPagina(1);
    limparBuscaEnderecos();
  };

  const buscarComoEndereco = async () => {
    const termo = buscaAplicada.trim();
    const idBusca = buscaEnderecoAtualRef.current + 1;
    buscaEnderecoAtualRef.current = idBusca;
    setBuscaEnderecoRealizada(true);
    setResultadosEndereco([]);
    setMensagemEnderecos('');
    setErroEnderecos('');

    if (termo.length < 3) {
      setErroEnderecos('Digite pelo menos 3 caracteres na busca de locais antes de buscar como endereço.');
      return;
    }

    setBuscandoEnderecos(true);
    try {
      const { data } = await buscarEndereco(termo);
      if (buscaEnderecoAtualRef.current !== idBusca) return;
      const resultadosValidos = normalizarResultadosGeocodificacao(data)
        .map((item, indice) => ({
          id: String(item.id || indice),
          preenchimento: preenchimentoDeResultadoGeocodificacao(item)
        }))
        .filter((item) => item.preenchimento);
      setResultadosEndereco(resultadosValidos);
      setAtribuicaoEnderecos(data?.atribuicao || '© OpenStreetMap contributors');
      if (resultadosValidos.length === 0) {
        setMensagemEnderecos('Nenhum endereço encontrado. Tente outro termo ou faça o cadastro manual.');
      } else if (resultadosValidos.length === 1) {
        setMensagemEnderecos('1 endereço encontrado. Ele ainda não possui dados de acessibilidade no AcessaMapa.');
      } else {
        setMensagemEnderecos(`${resultadosValidos.length} endereços encontrados. Eles ainda não possuem dados de acessibilidade no AcessaMapa.`);
      }
    } catch (error) {
      if (buscaEnderecoAtualRef.current !== idBusca) return;
      setErroEnderecos(extrairMensagemErro(error, 'A busca de endereço não está disponível. Tente novamente mais tarde.'));
    } finally {
      if (buscaEnderecoAtualRef.current === idBusca) setBuscandoEnderecos(false);
    }
  };

  const mudarPagina = (novaPagina) => {
    setPagina(novaPagina);
    requestAnimationFrame(() => statusResultadosRef.current?.focus());
  };

  return (
    <main id="conteudo-principal" tabIndex="-1" aria-labelledby="titulo-pagina" className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-5">
        <div className="mx-auto max-w-7xl">
          <h1 id="titulo-pagina" className="text-2xl font-bold text-slate-950">Acessibilidade informada pela comunidade</h1>
          <p className="mt-1 max-w-3xl text-slate-700">
            Consulte locais pela lista. O mapa oferece apenas uma visualização complementar dos mesmos resultados.
          </p>
          <form onSubmit={pesquisar} role="search" className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="busca-locais" className="sr-only">Buscar por nome ou endereço</label>
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-500" aria-hidden="true" />
              <input
                id="busca-locais"
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                className="input pl-10"
                placeholder="Nome ou endereço do local"
              />
            </div>
            <button type="submit" className="button-primary">Buscar</button>
            <button
              type="button"
              className="button-secondary"
              aria-expanded={painelFiltros}
              aria-controls="painel-filtros"
              onClick={() => setPainelFiltros((valor) => !valor)}
            >
              <FiFilter aria-hidden="true" /> Filtros
            </button>
          </form>

          {painelFiltros && (
            <section id="painel-filtros" aria-labelledby="titulo-filtros" className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <h2 id="titulo-filtros" className="text-lg font-semibold">Filtrar resultados</h2>
                <button type="button" className="button-quiet" onClick={limparFiltros}>
                  <FiX aria-hidden="true" /> Limpar filtros
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="filtro-categoria" className="label">Categoria</label>
                  <select id="filtro-categoria" className="input" value={filtros.categoria} onChange={(event) => { setPagina(1); setFiltros({ ...filtros, categoria: event.target.value }); }}>
                    <option value="">Todas</option>
                    {Object.entries(CATEGORIAS).map(([valor, item]) => <option key={valor} value={valor}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="filtro-recurso" className="label">Recurso presente</label>
                  <select id="filtro-recurso" className="input" value={filtros.recurso} onChange={(event) => { setPagina(1); setFiltros({ ...filtros, recurso: event.target.value }); }}>
                    <option value="">Todos</option>
                    {Object.entries(RECURSOS).map(([valor, item]) => <option key={valor} value={valor}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="filtro-nota" className="label">Média mínima</label>
                  <select id="filtro-nota" className="input" value={filtros.notaMinima} onChange={(event) => { setPagina(1); setFiltros({ ...filtros, notaMinima: event.target.value }); }}>
                    <option value="">Qualquer média</option>
                    {[2, 3, 4, 5].map((nota) => <option key={nota} value={nota}>{nota} ou mais</option>)}
                  </select>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p ref={statusResultadosRef} tabIndex="-1" role="status" aria-live="polite" className="font-medium text-slate-800">
            {carregando ? 'Carregando locais...' : `${paginacao.total} ${paginacao.total === 1 ? 'local encontrado' : 'locais encontrados'}. Página ${paginacao.pagina} de ${Math.max(1, paginacao.totalPaginas)}.`}
          </p>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1" role="group" aria-label="Visualização dos resultados">
            <button type="button" className={`view-toggle ${visualizacao === 'lista' ? 'view-toggle-active' : ''}`} aria-pressed={visualizacao === 'lista'} onClick={() => setVisualizacao('lista')}>
              <FiList aria-hidden="true" /> Lista
            </button>
            <button type="button" className={`view-toggle ${visualizacao === 'mapa' ? 'view-toggle-active' : ''}`} aria-pressed={visualizacao === 'mapa'} onClick={() => setVisualizacao('mapa')}>
              <FiMap aria-hidden="true" /> Mapa
            </button>
          </div>
        </div>

        {erro && (
          <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
            <p>{erro}</p>
            <button type="button" className="mt-2 font-semibold underline" onClick={carregarLocais}>Tentar novamente</button>
          </div>
        )}

        <div className="grid min-h-[36rem] grid-cols-1 gap-5">
          <section className={visualizacao === 'lista' ? 'block' : 'hidden'} aria-labelledby="titulo-lista">
            <h2 id="titulo-lista" className="sr-only">Lista de locais</h2>
            <ul className="space-y-3">
              {locais.map((local) => {
                const id = idDe(local);
                const media = mediaDe(local);
                const total = totalAvaliacoesDe(local);
                const presentes = Object.entries(local.recursos || {}).filter(([, estado]) => estado === 'presente' || estado === true);
                return (
                  <li key={id} className="card">
                    <article>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            <Link className="rounded-sm text-blue-900 underline decoration-2 underline-offset-2" to={`/local/${id}`}>{local.nome}</Link>
                          </h3>
                          <p className="mt-1 text-sm text-slate-700">{local.endereco}</p>
                        </div>
                        <CategoriaBadge categoria={local.categoria} />
                      </div>
                      <div className="mt-3"><StarRating nota={media} somenteLeitura tamanho="text-sm" /></div>
                      <p className="mt-1 text-xs text-slate-600">{total > 0 ? `${total} avaliações aprovadas` : 'Nenhuma avaliação aprovada'}</p>
                      <p className="mt-3 line-clamp-3 text-sm text-slate-700">{local.descricao}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {presentes.slice(0, 3).map(([recurso, estado]) => <RecursoBadge key={recurso} recurso={recurso} estado={estado} />)}
                        {presentes.length === 0 && <span className="text-sm text-slate-600">Nenhum recurso informado como presente.</span>}
                      </div>
                      <p className="mt-3 text-xs text-slate-600">Informações do autor aguardam confirmação da comunidade.</p>
                    </article>
                  </li>
                );
              })}
            </ul>
            {!carregando && locais.length === 0 && !erro && (
              <section className="card text-center" aria-labelledby="titulo-sem-locais">
                <h3 id="titulo-sem-locais" className="font-semibold text-slate-950">
                  {buscaAplicada ? `Nenhum local cadastrado corresponde a “${buscaAplicada}”.` : 'Nenhum local corresponde aos filtros.'}
                </h3>
                {buscaAplicada ? (
                  <>
                    <p className="mt-2 text-sm text-slate-700">Você pode buscar esse termo como endereço. A consulta só será feita ao acionar o botão.</p>
                    <button type="button" className="button-secondary mt-3" disabled={buscandoEnderecos} onClick={buscarComoEndereco}>
                      <FiSearch aria-hidden="true" /> {buscandoEnderecos ? 'Buscando endereços...' : `Buscar “${buscaAplicada}” como endereço`}
                    </button>
                    <p className="mt-3 text-sm"><Link to="/novo-local" className="font-semibold text-blue-800 underline">Cadastrar um local manualmente</Link></p>
                  </>
                ) : (
                  <Link to="/novo-local" className="mt-2 inline-block font-semibold text-blue-800 underline">Cadastrar um local</Link>
                )}
              </section>
            )}

            {!carregando && locais.length === 0 && !erro && buscaAplicada && buscaEnderecoRealizada && (
              <section className="card mt-3 text-left" aria-labelledby="titulo-enderecos" aria-busy={buscandoEnderecos}>
                <h3 id="titulo-enderecos" className="text-lg font-bold text-slate-950">
                  {buscandoEnderecos
                    ? 'Buscando endereços'
                    : resultadosEndereco.length > 0
                      ? 'Endereços encontrados — sem dados de acessibilidade'
                      : erroEnderecos
                        ? 'Não foi possível buscar endereços'
                        : 'Nenhum endereço geográfico encontrado'}
                </h3>
                <p className="mt-1 text-sm text-slate-700">Estes são resultados da busca geográfica, não locais cadastrados ou avaliados pela comunidade.</p>
                {erroEnderecos && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{erroEnderecos}</p>}
                <p role="status" aria-live="polite" className="mt-3 text-sm text-slate-700">
                  {buscandoEnderecos ? 'Buscando endereços...' : mensagemEnderecos}
                </p>
                {resultadosEndereco.length > 0 && (
                  <ul className="mt-4 space-y-3">
                    {resultadosEndereco.map(({ id, preenchimento }) => (
                      <li key={id} className="rounded-lg border border-slate-300 bg-white p-4">
                        <p className="font-semibold text-slate-950">{preenchimento.endereco}</p>
                        <p className="mt-1 text-sm text-slate-700">Endereço sem informações de acessibilidade cadastradas.</p>
                        <Link
                          to="/novo-local"
                          state={{ preenchimentoLocal: preenchimento }}
                          className="mt-3 inline-block font-semibold text-blue-800 underline"
                        >
                          Cadastrar acessibilidade deste endereço
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {!buscandoEnderecos && !erroEnderecos && <p className="mt-3 text-xs text-slate-600">Busca geográfica: {atribuicaoEnderecos}.</p>}
              </section>
            )}
          </section>
          <div className={`${visualizacao === 'mapa' ? 'block' : 'hidden'} min-h-[32rem]`}>
            <MapaSobDemanda ativo={visualizacao === 'mapa'} locais={locais} titulo="Mapa dos locais" />
          </div>
        </div>
        {paginacao.totalPaginas > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginação dos locais">
            <button type="button" className="button-secondary" disabled={paginacao.pagina <= 1 || carregando} onClick={() => mudarPagina(paginacao.pagina - 1)}>Página anterior</button>
            <span aria-current="page">Página {paginacao.pagina} de {paginacao.totalPaginas}</span>
            <button type="button" className="button-secondary" disabled={!paginacao.temProximaPagina || carregando} onClick={() => mudarPagina(paginacao.pagina + 1)}>Próxima página</button>
          </nav>
        )}
      </div>
    </main>
  );
}
