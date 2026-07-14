import { CATEGORIAS, ESTADOS_RECURSO, RECURSOS } from '../constants';
import { estadoRecursoDe } from '../utils/domain';

const estilosEstado = {
  presente: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  ausente: 'border-rose-300 bg-rose-50 text-rose-900',
  desconhecido: 'border-slate-300 bg-slate-50 text-slate-800'
};

export function RecursoBadge({ recurso, estado = 'desconhecido' }) {
  const info = RECURSOS[recurso];
  if (!info) return null;
  const Icon = info.icon;
  const estadoNormalizado = estadoRecursoDe(estado);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${estilosEstado[estadoNormalizado]}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {info.label}: {ESTADOS_RECURSO[estadoNormalizado]}
    </span>
  );
}

export function CategoriaBadge({ categoria }) {
  const info = CATEGORIAS[categoria];
  if (!info) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
      <span aria-hidden="true">{info.emoji}</span>
      {info.label}
    </span>
  );
}

export function RecursosFieldset({ valores, onChange, legenda = 'Recursos de acessibilidade informados' }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-slate-900">{legenda}</legend>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        Escolha “não informado” quando você não tiver certeza. Os dados enviados serão moderados.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(RECURSOS).map(([chave, info]) => {
          const Icon = info.icon;
          return (
            <fieldset key={chave} className="rounded-lg border border-slate-300 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-800">
                <Icon className="mr-1 inline h-4 w-4" aria-hidden="true" />
                {info.label}
              </legend>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {Object.entries(ESTADOS_RECURSO).map(([estado, rotulo]) => (
                  <label key={estado} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`recurso-${chave}`}
                      value={estado}
                      checked={estadoRecursoDe(valores?.[chave]) === estado}
                      onChange={() => onChange(chave, estado)}
                    />
                    {rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
    </fieldset>
  );
}
