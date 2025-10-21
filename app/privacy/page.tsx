
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white flex justify-center py-10 px-2">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Política de Privacidade</h1>
        <p className="mb-4 text-gray-700 text-lg">
          Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações no aplicativo de controle de agenda (Android e iOS).
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">1. Informações Coletadas</h2>
        <p className="mb-4 text-gray-700">
          Coletamos informações fornecidas por você, como nome, telefone, e-mail, dados de agendamento e preferências de notificação. Também coletamos dados técnicos, como identificadores do dispositivo e expo push token para envio de notificações.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">2. Uso das Informações</h2>
        <p className="mb-2 text-gray-700">
          Utilizamos suas informações para:
        </p>
        <ul className="list-disc ml-6 mb-4 text-gray-700">
          <li>Gerenciar e exibir seus agendamentos</li>
          <li>Enviar notificações sobre agendamentos e lembretes</li>
          <li>Melhorar a experiência do usuário</li>
          <li>Cumprir obrigações legais</li>
        </ul>
        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">3. Compartilhamento de Dados</h2>
        <p className="mb-4 text-gray-700">
          Não compartilhamos suas informações pessoais com terceiros, exceto quando necessário para o funcionamento do app (ex: envio de notificações) ou exigido por lei.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">4. Segurança</h2>
        <p className="mb-4 text-gray-700">
          Adotamos medidas de segurança para proteger seus dados contra acesso não autorizado, alteração ou divulgação.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">5. Seus Direitos</h2>
        <p className="mb-4 text-gray-700">
          Você pode solicitar a atualização, correção ou exclusão de seus dados pessoais a qualquer momento, entrando em contato pelo suporte do aplicativo.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">6. Alterações nesta Política</h2>
        <p className="mb-4 text-gray-700">
          Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças relevantes pelo próprio app.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">7. Contato</h2>
        <p className="mb-2 text-gray-700">
          Em caso de dúvidas, entre em contato pelo e-mail: <a href="mailto:caio.nerd.0@gmail.com" className="text-blue-600 underline">caio.nerd.0@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
