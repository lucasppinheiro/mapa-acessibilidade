import { lazy, Suspense, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

const MapaInterativo = lazy(() => import('./MapaInterativo'));

export default function MapaSobDemanda({
  ativo,
  mensagem = 'Carregando mapa...',
  mensagemErro = 'O mapa não pôde ser carregado. Continue pela alternativa textual disponível nesta página.',
  ...props
}) {
  const [jaFoiAtivado, setJaFoiAtivado] = useState(ativo);
  if (ativo && !jaFoiAtivado) setJaFoiAtivado(true);

  if (!ativo && !jaFoiAtivado) return null;

  return (
    <div className="h-full" hidden={!ativo}>
      <ErrorBoundary
        fallback={(
          <div role="alert" className="flex h-full min-h-64 items-center justify-center rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-950">
            <p>{mensagemErro}</p>
          </div>
        )}
      >
        <Suspense
          fallback={(
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 p-4">
              <p role="status">{mensagem}</p>
            </div>
          )}
        >
          <MapaInterativo {...props} ativo={ativo} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
