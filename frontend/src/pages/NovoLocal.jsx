import { useRef, useState } from 'react';
import { FiCrosshair, FiSearch, FiSend } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import InlineError from '../components/InlineError';
import MapaSobDemanda from '../components/MapaSobDemanda';
import { RecursosFieldset } from '../components/RecursosInfo';
import { CATEGORIAS, recursosDesconhecidos } from '../constants';
import { buscarEndereco, criarLocal, extrairMensagemErro } from '../services/api';
import { errosDeCampos } from '../utils/domain';
import {
  normalizarPreenchimentoLocal,
  normalizarResultadosGeocodificacao,
  preenchimentoDeResultadoGeocodificacao
} from '../utils/navigation';

const validar = (form) => {
  const erros = {};
  if (form.nome.trim().length < 2) erros.nome = 'Informe o nome do local.';
  if (form.endereco.trim().length < 5) erros.endereco = 'Informe o endereço ou uma referência.';
  if (form.descricao.trim().length < 10) erros.descricao = 'Descreva o local com pelo menos 10 caracteres.';
  const latitudeVazia = String(form.latitude).trim() === '';
  const longitudeVazia = String(form.longitude).trim() === '';
  const lat = latitudeVazia ? Number.NaN : Number(form.latitude);
  const lng = longitudeVazia ? Number.NaN : Number(form.longitude);
  if (latitudeVazia || !Number.isFinite(lat) || lat < -90 || lat > 90) erros.latitude = 'Informe uma latitude entre -90 e 90.';
  if (longitudeVazia || !Number.isFinite(lng) || lng < -180 || lng > 180) erros.longitude = 'Informe uma longitude entre -180 e 180.';
  return erros;
};

export default function NovoLocal() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const formRef = useRef(null);
  const [preenchimentoInicial] = useState(() => normalizarPreenchimentoLocal(state?.preenchimentoLocal));
  const [form, setForm] = useState(() => ({
    nome: '',
    endereco: preenchimentoInicial?.endereco || '',
    descricao: '',
    categoria: 'outro',
    latitude: preenchimentoInicial?.latitude || '',
    longitude: preenchimentoInicial?.longitude || '',
    recursos: recursosDesconhecidos()
  }));
  const [consulta, setConsulta] = useState(preenchimentoInicial?.endereco || '');
  const [resultados, setResultados] = useState([]);
  const [resultadoSelecionado, setResultadoSelecionado] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});
  const [mensagemEndereco, setMensagemEndereco] = useState(
    preenchimentoInicial ? 'Endereço e coordenadas preenchidos a partir da busca. Revise-os antes de enviar.' : ''
  );
  const [erroGeral, setErroGeral] = useState('');
  const [mapaAberto, setMapaAberto] = useState(false);

  const atualizar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const latitude = String(form.latitude).trim() === '' ? Number.NaN : Number(form.latitude);
  const longitude = String(form.longitude).trim() === '' ? Number.NaN : Number(form.longitude);
  const coordenadas = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? { lat: latitude, lng: longitude }
    : null;

  const pesquisarEndereco = async () => {
    setMensagemEndereco('');
    if (consulta.trim().length < 3) {
      setMensagemEndereco('Digite pelo menos 3 caracteres e acione o botão Buscar endereço.');
      return;
    }
    setBuscando(true);
    try {
      const { data } = await buscarEndereco(consulta.trim());
      const itens = normalizarResultadosGeocodificacao(data);
      setResultados(itens);
      setMensagemEndereco(itens.length ? `${itens.length} resultados encontrados.` : 'Nenhum endereço encontrado. Você pode preencher as coordenadas manualmente.');
    } catch (error) {
      setMensagemEndereco(extrairMensagemErro(error, 'A busca de endereço não está disponível. Preencha as coordenadas manualmente.'));
    } finally {
      setBuscando(false);
    }
  };

  const selecionarResultado = (item, indice) => {
    const preenchimento = preenchimentoDeResultadoGeocodificacao(item);
    if (!preenchimento) {
      setMensagemEndereco('Este resultado não possui coordenadas válidas. Escolha outro ou preencha os campos manualmente.');
      return;
    }
    setResultadoSelecionado(String(item.id || indice));
    setForm((atual) => ({ ...atual, ...preenchimento }));
  };

  const usarLocalizacao = () => {
    setMensagemEndereco('');
    if (!navigator.geolocation) {
      setMensagemEndereco('Seu navegador não oferece geolocalização. Preencha latitude e longitude manualmente.');
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((atual) => ({ ...atual, latitude: String(coords.latitude), longitude: String(coords.longitude) }));
        setMensagemEndereco('Coordenadas preenchidas. Revise-as antes de enviar.');
        setLocalizando(false);
      },
      () => {
        setMensagemEndereco('Localização não compartilhada. Você pode buscar um endereço ou digitar as coordenadas.');
        setLocalizando(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const enviar = async (event) => {
    event.preventDefault();
    const novosErros = validar(form);
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    setSalvando(true);
    try {
      await criarLocal({
        nome: form.nome.trim(),
        endereco: form.endereco.trim(),
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        recursos: form.recursos,
        localizacao: { type: 'Point', coordinates: [Number(form.longitude), Number(form.latitude)] }
      });
      toast.success('Local enviado para moderação.');
      navigate('/');
    } catch (error) {
      const errosApi = errosDeCampos(error, {
        'localizacao.coordinates': 'latitude'
      });
      if (Object.keys(errosApi).length) {
        setErros(errosApi);
        requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      } else {
        setErroGeral(extrairMensagemErro(error, 'Não foi possível enviar o local. Revise os dados e tente novamente.'));
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main id="conteudo-principal" tabIndex="-1" aria-labelledby="titulo-pagina" className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 id="titulo-pagina" className="text-3xl font-bold text-slate-950">Cadastrar local</h1>
        <p className="mt-2 max-w-3xl text-slate-700">Os dados serão tratados como informados pelo autor e só ficarão públicos após moderação.</p>

        <form ref={formRef} noValidate onSubmit={enviar} className="mt-6 space-y-6">
          {erroGeral && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">{erroGeral}</p>}

          <section className="card" aria-labelledby="titulo-dados-local">
            <h2 id="titulo-dados-local" className="text-xl font-semibold">Dados do local</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="nome" className="label">Nome do local</label>
                <input id="nome" className="input" required maxLength="200" value={form.nome} onChange={(event) => atualizar('nome', event.target.value)} aria-invalid={Boolean(erros.nome)} aria-describedby={erros.nome ? 'erro-nome' : undefined} />
                <InlineError id="erro-nome">{erros.nome}</InlineError>
              </div>
              <div>
                <label htmlFor="categoria" className="label">Categoria</label>
                <select id="categoria" className="input" value={form.categoria} onChange={(event) => atualizar('categoria', event.target.value)}>
                  {Object.entries(CATEGORIAS).map(([valor, item]) => <option key={valor} value={valor}>{item.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="descricao" className="label">Descrição</label>
                <textarea id="descricao" className="input min-h-28 resize-y" required maxLength="1000" value={form.descricao} onChange={(event) => atualizar('descricao', event.target.value)} aria-invalid={Boolean(erros.descricao)} aria-describedby={erros.descricao ? 'erro-descricao' : 'ajuda-descricao'} />
                <p id="ajuda-descricao" className="mt-1 text-sm text-slate-600">Descreva o local; não inclua dados pessoais.</p>
                <InlineError id="erro-descricao">{erros.descricao}</InlineError>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="titulo-endereco">
            <h2 id="titulo-endereco" className="text-xl font-semibold">Endereço e coordenadas</h2>
            <p className="mt-1 text-sm text-slate-700">A busca só ocorre quando você aciona o botão. Não informe nomes de pessoas ou outros dados pessoais.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row" role="search">
              <label htmlFor="consulta-endereco" className="sr-only">Endereço para busca</label>
              <input id="consulta-endereco" className="input flex-1" value={consulta} onChange={(event) => setConsulta(event.target.value)} placeholder="Rua, número, cidade e estado" />
              <button type="button" className="button-secondary" disabled={buscando} onClick={pesquisarEndereco}><FiSearch aria-hidden="true" /> {buscando ? 'Buscando...' : 'Buscar endereço'}</button>
            </div>
            <p className="mt-2 text-xs text-slate-600">Busca geográfica: © colaboradores do OpenStreetMap.</p>
            <p className="mt-2 text-sm text-slate-700" role="status" aria-live="polite">{mensagemEndereco}</p>

            {resultados.length > 0 && (
              <fieldset className="mt-4">
                <legend className="font-semibold text-slate-900">Selecione um resultado</legend>
                <div className="mt-2 space-y-2">
                  {resultados.map((item, indice) => {
                    const valor = String(item.id || indice);
                    const rotulo = item.endereco || item.nome || item.display_name;
                    return (
                      <label key={valor} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-3 has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50">
                        <input type="radio" name="resultado-endereco" className="mt-1" value={valor} checked={resultadoSelecionado === valor} onChange={() => selecionarResultado(item, indice)} />
                        <span>{rotulo}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="mt-5">
              <label htmlFor="endereco" className="label">Endereço ou referência</label>
              <input id="endereco" className="input" required maxLength="300" value={form.endereco} onChange={(event) => atualizar('endereco', event.target.value)} aria-invalid={Boolean(erros.endereco)} aria-describedby={erros.endereco ? 'erro-endereco' : undefined} />
              <InlineError id="erro-endereco">{erros.endereco}</InlineError>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="latitude" className="label">Latitude</label>
                <input id="latitude" type="number" step="any" min="-90" max="90" required inputMode="decimal" className="input" value={form.latitude} onChange={(event) => atualizar('latitude', event.target.value)} aria-invalid={Boolean(erros.latitude)} aria-describedby={erros.latitude ? 'erro-latitude' : undefined} />
                <InlineError id="erro-latitude">{erros.latitude}</InlineError>
              </div>
              <div>
                <label htmlFor="longitude" className="label">Longitude</label>
                <input id="longitude" type="number" step="any" min="-180" max="180" required inputMode="decimal" className="input" value={form.longitude} onChange={(event) => atualizar('longitude', event.target.value)} aria-invalid={Boolean(erros.longitude)} aria-describedby={erros.longitude ? 'erro-longitude' : undefined} />
                <InlineError id="erro-longitude">{erros.longitude}</InlineError>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-950">Usar a localização do dispositivo é opcional</h3>
              <p className="mt-1 text-sm text-blue-950">O navegador pedirá permissão somente depois do clique. A recusa não impede o cadastro.</p>
              <button type="button" className="button-secondary mt-3" disabled={localizando} onClick={usarLocalizacao}><FiCrosshair aria-hidden="true" /> {localizando ? 'Obtendo localização...' : 'Usar minha localização'}</button>
            </div>

            <details className="mt-5 rounded-lg border border-slate-300 p-4" onToggle={(event) => setMapaAberto(event.currentTarget.open)}>
              <summary className="cursor-pointer font-semibold text-slate-900">Conferir ou ajustar no mapa (opcional)</summary>
              <p className="mt-2 text-sm text-slate-700">Clique no mapa para ajustar as coordenadas. O preenchimento manual acima continua disponível.</p>
              <div className="mt-3 h-96">
                <MapaSobDemanda ativo={mapaAberto} marcadorSelecionado={coordenadas} onLocationSelect={({ lat, lng }) => setForm((atual) => ({ ...atual, latitude: String(lat), longitude: String(lng) }))} titulo="Mapa para conferência das coordenadas" />
              </div>
            </details>
          </section>

          <section className="card"><RecursosFieldset valores={form.recursos} onChange={(recurso, estado) => setForm((atual) => ({ ...atual, recursos: { ...atual.recursos, [recurso]: estado } }))} /></section>

          <button type="submit" className="button-primary" disabled={salvando}><FiSend aria-hidden="true" /> {salvando ? 'Enviando...' : 'Enviar para moderação'}</button>
        </form>
      </div>
    </main>
  );
}
