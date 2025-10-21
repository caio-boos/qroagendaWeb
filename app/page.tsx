import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sistema de Agendamento</CardTitle>
          <CardDescription>Gerencie seus agendamentos com facilidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para acessar a página de agendamento, use o link: <br />
            <code className="mt-2 block rounded bg-muted p-2 text-xs">/agendar/[userId]</code>
          </p>
          <Button asChild className="w-full">
            <Link href="/agendar/4yNTkfcEeyd7o3EYdAvpFhMHAHB2">Ver Exemplo</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
