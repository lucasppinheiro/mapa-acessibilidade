import { useState } from 'react';
import { FiFlag } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { criarDenuncia, extrairMensagemErro } from '../services/api';

export default function DenunciaForm({ alvoTipo, alvoId }) {
  const { autenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [motivo, setMotivo] = useState('informacao_incorreta');
  const [detalhes, setDetalhes] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event) => {
    event.preventDefault();
    if (!autenticado) {
      navigate('/login', { state: { destino: location.pathname } });
      return;
    }
    setEnviando(true);
    setMensagem('');
    try {
      await criarDenuncia({ alvoTipo, alvoId, motivo, detalhes: detalhes.trim() || undefined });
      setMensagem('Denúncia enviada para análise da moderação.');
      setDetalhes('');
    } catch (error) {
      setMensagem(extrairMensagemErro(error, 'Não foi possível enviar a denúncia.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <details className="mt-3 rounded-lg border border-slate-300 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800"><FiFlag className="mr-1 inline" aria-hidden="true" /> Denunciar este conteúdo</summary>
      <form onSubmit={enviar} className="mt-3 space-y-3">
        <div>
          <label htmlFor={`motivo-${alvoTipo}-${alvoId}`} className="label">Motivo</label>
          <select id={`motivo-${alvoTipo}-${alvoId}`} className="input" value={motivo} onChange={(event) => setMotivo(event.target.value)}>
            <option value="informacao_incorreta">Informação incorreta</option>
            <option value="conteudo_inadequado">Conteúdo inadequado</option>
            <option value="duplicado">Conteúdo duplicado</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label htmlFor={`detalhes-${alvoTipo}-${alvoId}`} className="label">Detalhes (opcional)</label>
          <textarea id={`detalhes-${alvoTipo}-${alvoId}`} className="input min-h-20" maxLength="1000" value={detalhes} onChange={(event) => setDetalhes(event.target.value)} />
        </div>
        <button type="submit" className="button-secondary" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar denúncia'}</button>
        {mensagem && <p role="status" className="text-sm text-slate-800">{mensagem}</p>}
      </form>
    </details>
  );
}
