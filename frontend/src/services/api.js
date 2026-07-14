import axios from 'axios';

const API_BASE_URL = '/api/v1';

let accessToken = null;
let refreshEmAndamento = null;

export const definirAccessToken = (token) => {
  accessToken = token || null;
};

export const limparAccessToken = () => {
  accessToken = null;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

const clienteRefresh = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

const extrairCodigoErro = (error) => error.response?.data?.erro?.codigo;

export const extrairMensagemErro = (error, fallback = 'Não foi possível concluir a operação.') => (
  error.response?.data?.erro?.mensagem || fallback
);

export const renovarSessao = async () => {
  const { data } = await clienteRefresh.post('/auth/refresh');
  definirAccessToken(data.accessToken);
  return data;
};

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const codigo = extrairCodigoErro(error);
    const rota = String(original.url || '');
    const ehRotaAuth = ['/auth/login', '/auth/registro', '/auth/refresh'].some((prefixo) => rota.startsWith(prefixo));

    if (error.response?.status === 401 && !original._retry && !ehRotaAuth) {
      original._retry = true;
      try {
        if (!refreshEmAndamento) {
          refreshEmAndamento = renovarSessao().finally(() => {
            refreshEmAndamento = null;
          });
        }
        await refreshEmAndamento;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        limparAccessToken();
      }
    }

    if (error.response?.status === 401 && codigo) {
      limparAccessToken();
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: codigo } }));
    }

    return Promise.reject(error);
  }
);

export const registrar = (dados) => api.post('/auth/registro', dados);
export const login = (dados) => api.post('/auth/login', dados);
export const obterPerfil = () => api.get('/auth/perfil');
export const logoutAtual = () => api.post('/auth/logout');
export const logoutTodas = () => api.post('/auth/logout-todas');
export const excluirConta = (dados) => api.delete('/auth/perfil', { data: dados });

export const listarLocais = (params) => api.get('/locais', { params });
export const obterLocal = (id) => api.get(`/locais/${id}`);
export const criarLocal = (dados) => api.post('/locais', dados);
export const atualizarLocal = (id, dados) => api.patch(`/locais/${id}`, dados);
export const arquivarLocal = (id) => api.delete(`/locais/${id}`);

export const listarAvaliacoes = (localId, params) => api.get(`/locais/${localId}/avaliacoes`, { params });
export const criarAvaliacao = (localId, dados) => api.post(`/locais/${localId}/avaliacoes`, dados);
export const arquivarAvaliacao = (localId, avaliacaoId) => api.delete(`/locais/${localId}/avaliacoes/${avaliacaoId}`);

export const buscarEndereco = (consulta) => api.get('/geocodificacao', { params: { q: consulta } });
export const criarDenuncia = (dados) => api.post('/denuncias', dados);

export const listarFilaModeracao = (params) => api.get('/moderacao', { params });
export const aprovarConteudo = (tipo, id) => api.post(`/moderacao/${tipo}/${id}/aprovar`);
export const rejeitarConteudo = (tipo, id, motivo) => api.post(`/moderacao/${tipo}/${id}/rejeitar`, { motivo });
export const listarHistoricoModeracao = (params) => api.get('/moderacao/historico', { params });

export default api;
