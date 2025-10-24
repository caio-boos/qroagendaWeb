import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-700 to-purple-500 text-white flex items-center">
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Hero */}
          <section className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold">QroAgenda — Agendamento inteligente</h1>
            <p className="text-lg text-purple-100 max-w-xl">
              Plataforma de agendamento para salões e profissionais. Permita que seus clientes reservem serviços com facilidade — agenda online, lembretes via WhatsApp e notificações.
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button asChild className="bg-white text-purple-700 font-semibold">
                <Link href="/saloes">Ver Salões</Link>
              </Button>

              <a
                href="https://play.google.com/store/apps/details?id=com.devcaioeduardo.qroagendaApp"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/25"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                Baixar na Play Store
              </a>
            </div>
          </section>

          {/* Feature / image area */}
          <section className="hidden md:flex items-center justify-center">
            <Card className="w-full max-w-md bg-white/10 border-white/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">Seu salão na palma do cliente</h3>
                  <p className="text-purple-50">
                    Crie horários, gerencie profissionais e envie lembretes automaticamente. Interface simples e integração com WhatsApp.
                  </p>
                  <div className="mt-4">
                    <Link href="/saloes" className="inline-block px-4 py-2 rounded bg-white text-purple-700 font-semibold">Explorar Salões</Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        <footer className="mt-12 text-center text-purple-100/80">
          <p>© {new Date().getFullYear()} QroAgenda — Agendamentos rápidos e integrados.</p>
        </footer>
      </div>
    </main>
  )
}
