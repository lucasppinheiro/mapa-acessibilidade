import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  definirAccessToken,
  excluirConta as excluirContaApi,
  extrairMensagemErro,
  limparAccessToken,
  login as loginApi,
  logoutAtual,
  logoutTodas as logoutTodasApi,
  obterPerfil,
  registrar as registrarApi,
  renovarSessao
} from '../services/api';
import { AuthContext } from './AuthContextDef';

const usuarioDaResposta = (data) => data.usuario || data.perfil || data;

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const limparSessao = useCallback(() => {
    limparAccessToken();
    setUsuario(null);
  }, []);

  useEffect(() => {
    let ativo = true;

    const restaurarSessao = async () => {
      try {
        const { usuario: usuarioRefresh } = await renovarSessao();
        const perfil = usuarioRefresh || usuarioDaResposta((await obterPerfil()).data);
        if (ativo) setUsuario(perfil);
      } catch {
        limparAccessToken();
        if (ativo) setUsuario(null);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    restaurarSessao();
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    const forcarLogout = (event) => {
      limparSessao();
      if (event.detail?.reason === 'REUTILIZACAO_REFRESH_TOKEN') {
        toast.error('A sessão foi encerrada por segurança. Entre novamente.');
      }
    };

    window.addEventListener('auth:logout', forcarLogout);
    return () => window.removeEventListener('auth:logout', forcarLogout);
  }, [limparSessao]);

  const autenticar = async (requisicao, dados) => {
    const { data } = await requisicao(dados);
    definirAccessToken(data.accessToken);
    setUsuario(usuarioDaResposta(data));
    return data;
  };

  const login = (email, senha) => autenticar(loginApi, { email, senha });
  const registrar = ({ nome, email, senha }) => autenticar(registrarApi, { nome, email, senha });

  const logout = async () => {
    try {
      await logoutAtual();
    } finally {
      limparSessao();
    }
  };

  const logoutTodas = async () => {
    try {
      await logoutTodasApi();
    } finally {
      limparSessao();
    }
  };

  const excluirConta = async (dados) => {
    try {
      await excluirContaApi(dados);
      limparSessao();
    } catch (error) {
      throw new Error(extrairMensagemErro(error, 'Não foi possível excluir a conta.'));
    }
  };

  const value = {
    usuario,
    carregando,
    login,
    registrar,
    logout,
    logoutTodas,
    excluirConta,
    autenticado: Boolean(usuario),
    podeModerar: ['moderador', 'admin'].includes(usuario?.papel || usuario?.role)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
