export default function DataDeletionRequestPage() {
  return (
    <div className="min-h-screen bg-white flex justify-center py-10 px-2">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Solicitação de Exclusão de Dados</h1>
        <p className="mb-4 text-gray-700 text-lg">
          Se você deseja solicitar a exclusão dos seus dados pessoais do nosso sistema, preencha o formulário abaixo. Após o recebimento, processaremos sua solicitação conforme a legislação vigente.
        </p>
  <form className="space-y-6" action="mailto:caio.nerd.0@gmail.com" method="POST" encType="text/plain">
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Nome completo</label>
            <input type="text" name="Nome" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">E-mail</label>
            <input type="email" name="Email" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Telefone</label>
            <input type="tel" name="Telefone" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Motivo da solicitação</label>
            <textarea name="Motivo" required className="w-full border rounded px-3 py-2 min-h-[80px]" />
          </div>
          <button type="submit" className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition">Solicitar exclusão</button>
        </form>
        <p className="mt-6 text-gray-500 text-sm text-center">
          Em caso de dúvidas, entre em contato pelo e-mail: <a href="mailto:caio.nerd.0@gmail.com" className="text-blue-600 underline">caio.nerd.0@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
