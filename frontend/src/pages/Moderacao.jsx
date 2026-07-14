import { useCallback, useEffect, useState } from 'react';
import { aprovarConteudo, extrairMensagemErro, listarFilaModeracao, listarHistoricoModeracao, rejeitarConteudo } from '../services/api';
import { dataFormatada } from '../utils/domain';

function ResumoItem({ item }) {
  const conteudo = item.conteudo || {};
  if (item.tipo === 'local') return <><h3 className="text-lg font-semibold">Local: {conteudo.nome}</h3><p>{conteudo.endereco}</p><p className="mt-2">{conteudo.descricao}</p></>;
  if (item.tipo === 'avaliacao') return <><h3 className="text-lg font-semibold">Avaliação: {conteudo.nota} de 5</h3><p className="mt-2">{conteudo.comentario}</p></>;
  return <><h3 className="text-lg font-semibold">Denúncia: {conteudo.motivo}</h3><p>Alvo: {conteudo.alvoTipo} {conteudo.alvoId}</p>{conteudo.detalhes && <p className="mt-2">{conteudo.detalhes}</p>}</>;
}

export default function Moderacao() {
  const [itens, setItens] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [tipo, setTipo] = useState('');
  const [motivos, setMotivos] = useState({});
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [fila, historico] = await Promise.all([
        listarFilaModeracao(tipo ? { tipo } : undefined),
        listarHistoricoModeracao({ limite: 20 })
      ]);
      setItens(fila.data.itens || []);
      setEventos(historico.data.eventos || []);
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível carregar a fila de moderação.'));
    } finally {
      setCarregando(false);
    }
  }, [tipo]);

  useEffect(() => { carregar(); }, [carregar]);

  const aprovar = async (item) => {
    setMensagem('');
    try {
      await aprovarConteudo(item.tipo, item.id);
      setMensagem(item.tipo === 'denuncia' ? 'Denúncia marcada como procedente.' : 'Conteúdo aprovado e evento registrado.');
      await carregar();
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível aprovar o conteúdo.'));
    }
  };

  const rejeitar = async (item) => {
    const motivo = motivos[item.id]?.trim() || '';
    if (motivo.length < 5) {
      setErro('Informe um motivo de rejeição com pelo menos 5 caracteres.');
      document.getElementById(`motivo-${item.id}`)?.focus();
      return;
    }
    setMensagem('');
    try {
      await rejeitarConteudo(item.tipo, item.id, motivo);
      setMensagem(item.tipo === 'denuncia' ? 'Denúncia arquivada com justificativa.' : 'Conteúdo rejeitado com motivo e evento registrados.');
      await carregar();
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível rejeitar o conteúdo.'));
    }
  };

  return (
    <main id="conteudo-principal" tabIndex="-1" aria-labelledby="titulo-pagina" className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 id="titulo-pagina" className="text-3xl font-bold">Fila de moderação</h1>
        <p className="mt-2 text-slate-700">Revise o conteúdo antes de torná-lo público. As decisões entram no histórico append-only.</p>
        <div className="mt-5 max-w-xs"><label htmlFor="filtro-tipo" className="label">Filtrar por tipo</label><select id="filtro-tipo" className="input" value={tipo} onChange={(event) => setTipo(event.target.value)}><option value="">Todos</option><option value="local">Locais</option><option value="avaliacao">Avaliações</option><option value="denuncia">Denúncias</option></select></div>
        <div className="mt-4" aria-live="polite">{carregando && <p role="status">Carregando fila...</p>}{mensagem && <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-900">{mensagem}</p>}{erro && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{erro}</p>}</div>

        <section className="mt-6" aria-labelledby="titulo-pendentes">
          <h2 id="titulo-pendentes" className="text-2xl font-semibold">Pendentes ({itens.length})</h2>
          <div className="mt-4 space-y-4">
            {itens.map((item) => (
              <article key={`${item.tipo}-${item.id}`} className="card">
                <ResumoItem item={item} />
                <p className="mt-3 text-sm text-slate-600">Enviado em {dataFormatada(item.submetidoEm)}</p>
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <label htmlFor={`motivo-${item.id}`} className="label">Motivo da rejeição</label>
                    <textarea id={`motivo-${item.id}`} className="input min-h-20" value={motivos[item.id] || ''} onChange={(event) => setMotivos({ ...motivos, [item.id]: event.target.value })} />
                    <div className="mt-3 flex flex-wrap gap-3"><button type="button" className="button-primary" onClick={() => aprovar(item)}>{item.tipo === 'denuncia' ? 'Marcar como procedente' : 'Aprovar'}</button><button type="button" className="button-danger" onClick={() => rejeitar(item)}>{item.tipo === 'denuncia' ? 'Arquivar denúncia' : 'Rejeitar com motivo'}</button></div>
                  </div>
              </article>
            ))}
            {!carregando && !itens.length && <p className="card">Não há itens pendentes neste filtro.</p>}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="titulo-historico">
          <h2 id="titulo-historico" className="text-2xl font-semibold">Histórico recente</h2>
          <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-300 bg-white">
            {eventos.map((evento) => <li key={evento.id} className="p-4"><span className="font-semibold">{evento.acao}</span> — {evento.entidadeTipo} {evento.entidadeId}<span className="block text-sm text-slate-600">{dataFormatada(evento.criadoEm)}</span></li>)}
            {!eventos.length && <li className="p-4">Nenhum evento disponível.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
