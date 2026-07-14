import {
  FiArrowUp,
  FiCornerDownRight,
  FiDroplet,
  FiEye,
  FiGrid,
  FiHeadphones,
  FiHeart,
  FiMaximize,
  FiMessageSquare,
  FiTruck
} from 'react-icons/fi';

export const CATEGORIAS = {
  restaurante: { label: 'Restaurante', emoji: '🍽️' },
  hospital: { label: 'Hospital', emoji: '🏥' },
  escola: { label: 'Escola', emoji: '🏫' },
  mercado: { label: 'Mercado', emoji: '🛒' },
  transporte: { label: 'Transporte', emoji: '🚌' },
  lazer: { label: 'Lazer', emoji: '🎭' },
  servico_publico: { label: 'Serviço público', emoji: '🏛️' },
  comercio: { label: 'Comércio', emoji: '🏪' },
  hotel: { label: 'Hotel', emoji: '🏨' },
  outro: { label: 'Outro', emoji: '📍' }
};

export const RECURSOS = {
  rampa: { label: 'Rampa de acesso', icon: FiCornerDownRight },
  elevador: { label: 'Elevador', icon: FiArrowUp },
  banheiroAcessivel: { label: 'Banheiro acessível', icon: FiDroplet },
  pisoTatil: { label: 'Piso tátil', icon: FiGrid },
  sinalizacaoBraile: { label: 'Sinalização em braile', icon: FiEye },
  estacionamentoAcessivel: { label: 'Estacionamento acessível', icon: FiTruck },
  portaLarga: { label: 'Porta larga', icon: FiMaximize },
  libras: { label: 'Atendimento em Libras', icon: FiMessageSquare },
  audioDescricao: { label: 'Audiodescrição', icon: FiHeadphones },
  caoPermitido: { label: 'Cão-guia permitido', icon: FiHeart }
};

export const ESTADOS_RECURSO = {
  presente: 'Presente',
  ausente: 'Ausente',
  desconhecido: 'Não informado'
};

export const recursosDesconhecidos = () => Object.fromEntries(
  Object.keys(RECURSOS).map((recurso) => [recurso, 'desconhecido'])
);
