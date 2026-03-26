import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';

export function PrivacyPolicyPage() {
  const { store } = useStore();
  const storeName = store?.name || 'Nossa Loja';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="btn btn-ghost btn-sm gap-1 mb-6">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Política de Privacidade</h1>
      <p className="mb-4 text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. Dados que coletamos</h2>
          <p>
            Ao realizar uma compra em <strong>{storeName}</strong>, coletamos os seguintes dados pessoais:
          </p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Nome completo</li>
            <li>Endereço de e-mail</li>
            <li>Telefone (opcional)</li>
            <li>Endereço de entrega (quando aplicável)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">2. Finalidade do tratamento</h2>
          <p>Seus dados são utilizados exclusivamente para:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Processar e entregar seu pedido</li>
            <li>Enviar confirmação e atualizações de status do pedido por e-mail</li>
            <li>Entrar em contato em caso de problemas com o pedido</li>
          </ul>
          <p className="mt-2">
            Não compartilhamos seus dados com terceiros para fins de marketing ou publicidade.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. Base legal (LGPD Art. 7)</h2>
          <p>
            O tratamento dos seus dados pessoais se baseia no seu <strong>consentimento</strong>, fornecido
            ao marcar a caixa de aceite no momento da compra, e na <strong>execução do contrato</strong> de
            compra e venda.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. Retenção de dados</h2>
          <p>
            Seus dados pessoais são mantidos pelo prazo necessário para cumprir as finalidades
            descritas acima. Em razão de obrigações legais e fiscais previstas na legislação
            brasileira, os dados relacionados a pedidos são armazenados por um período mínimo
            de 5 (cinco) anos. Após esse prazo, os dados poderão ser anonimizados ou excluídos,
            salvo se houver outra base legal que justifique sua manutenção.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. Seus direitos (LGPD Art. 18)</h2>
          <p>Você tem o direito de:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Confirmar a existência de tratamento dos seus dados</li>
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação dos seus dados</li>
            <li>Revogar o consentimento a qualquer momento</li>
          </ul>
          <p className="mt-2">
            Para exercer qualquer um desses direitos, entre em contato conosco pelo e-mail
            informado na loja ou pelo WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">6. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
            não autorizado, perda ou alteração. Nossos sistemas utilizam criptografia e controles
            de acesso restritos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">7. Alterações nesta política</h2>
          <p>
            Esta política pode ser atualizada periodicamente. Recomendamos que você a consulte
            regularmente. Alterações significativas serão comunicadas na página da loja.
          </p>
        </section>
      </div>
    </div>
  );
}
