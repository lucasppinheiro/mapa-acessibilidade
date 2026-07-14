import { FaStar } from 'react-icons/fa';
import { FiStar } from 'react-icons/fi';

export default function StarRating({
  nota,
  onChange,
  tamanho = 'text-xl',
  somenteLeitura = false,
  nome = 'nota',
  legenda = 'Nota de acessibilidade',
  erroId,
  obrigatorio = false
}) {
  const notaNumerica = Number(nota);

  if (somenteLeitura) {
    if (nota === null || nota === undefined || nota === '' || !Number.isFinite(notaNumerica)) {
      return <span className="text-sm font-medium text-slate-600">Ainda não avaliado</span>;
    }

    return (
      <span className="inline-flex items-center gap-2" aria-label={`${notaNumerica.toFixed(1)} de 5 estrelas`}>
        <span className="flex gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((estrela) => (
            estrela <= Math.round(notaNumerica)
              ? <FaStar key={estrela} className={`${tamanho} text-amber-600`} />
              : <FiStar key={estrela} className={`${tamanho} text-slate-400`} />
          ))}
        </span>
        <span className="text-sm font-semibold text-slate-800">{notaNumerica.toFixed(1)}</span>
      </span>
    );
  }

  return (
    <fieldset className="min-w-0" aria-describedby={erroId}>
      <legend className="mb-2 text-sm font-medium text-slate-800">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((estrela) => (
          <label key={estrela} className="rating-option">
            <input
              type="radio"
              name={nome}
              value={estrela}
              checked={notaNumerica === estrela}
              onChange={() => onChange(estrela)}
              required={obrigatorio}
              aria-describedby={estrela === 1 ? erroId : undefined}
            />
            <span aria-hidden="true"><FaStar /></span>
            <span className="sr-only">{estrela} {estrela === 1 ? 'estrela' : 'estrelas'}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
