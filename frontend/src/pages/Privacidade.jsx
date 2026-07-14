export default function Privacidade() {
  return (
    <main id="conteudo-principal" tabIndex="-1" aria-labelledby="titulo-pagina" className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-10">
      <article className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 id="titulo-pagina" className="text-3xl font-bold text-slate-950">Privacidade</h1>
          <p className="mt-2 text-slate-700">Como a demonstração do AcessaMapa reduz e protege os dados usados nas jornadas.</p>
        </div>

        <section aria-labelledby="dados-coletados">
          <h2 id="dados-coletados" className="text-xl font-semibold">Dados da conta</h2>
          <p className="mt-2">Nome, e-mail e senha são usados para autenticação. A senha é armazenada como hash, não em texto legível. O projeto não solicita tipo de deficiência. E-mail e credenciais não aparecem em respostas públicas.</p>
        </section>

        <section aria-labelledby="geolocalizacao">
          <h2 id="geolocalizacao" className="text-xl font-semibold">Geolocalização opcional</h2>
          <p className="mt-2">O navegador só pede sua localização após você acionar “Usar minha localização” no cadastro. A recusa não bloqueia a busca de endereço, a edição manual de latitude e longitude nem qualquer consulta.</p>
        </section>

        <section aria-labelledby="busca-endereco">
          <h2 id="busca-endereco" className="text-xl font-semibold">Busca de endereço</h2>
          <p className="mt-2">A consulta digitada é enviada pelo nosso backend ao provedor de geocodificação configurado e pode ser mantida em cache para reduzir requisições externas. A busca só ocorre após o botão e não oferece autocomplete. Não inclua nomes de pessoas, dados pessoais ou informações confidenciais.</p>
        </section>

        <section aria-labelledby="contribuicoes">
          <h2 id="contribuicoes" className="text-xl font-semibold">Contribuições e moderação</h2>
          <p className="mt-2">Locais, avaliações e denúncias entram em uma fila de moderação. Eventos de governança preservam o histórico das decisões. Não envie dados pessoais, credenciais, evidências brutas ou informações confidenciais nos textos.</p>
        </section>

        <section aria-labelledby="sessoes">
          <h2 id="sessoes" className="text-xl font-semibold">Sessões</h2>
          <p className="mt-2">O token de acesso fica apenas na memória do navegador. O token de renovação é enviado em cookie protegido e não fica disponível ao JavaScript da página.</p>
        </section>

        <section aria-labelledby="exclusao">
          <h2 id="exclusao" className="text-xl font-semibold">Exclusão da conta</h2>
          <p className="mt-2">A área “Conta” permite solicitar exclusão. Os dados pessoais da conta são anonimizados e as contribuições permanecem sem identificar a pessoa, preservando a integridade do histórico comunitário.</p>
        </section>

        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">Esta página descreve o comportamento planejado da demonstração v1; não é uma declaração de conformidade legal ou WCAG.</p>
      </article>
    </main>
  );
}
