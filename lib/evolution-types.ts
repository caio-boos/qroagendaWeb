// Evolution API Types
export interface EvolutionInstance {
  instanceName: string
  status: "open" | "close" | "connecting" | "disconnected"
  serverUrl: string
  apikey: string
}

export interface EvolutionQRCode {
  base64: string
  code: string
  count: number
}

export interface EvolutionMessage {
  number: string
  text: string
  options?: {
    delay?: number
    presence?: "recording" | "composing"
    linkPreview?: boolean
  }
}

export interface EvolutionWebhookEvent {
  event: string
  instance: string
  data: any
  destination: string
  date_time: string
}

export interface EvolutionCreateInstanceRequest {
  instanceName: string
  token: string
  qrcode: boolean
  integration: "WHATSAPP-BAILEYS"
  webhookUrl?: string
  webhookByEvents?: boolean
  webhookBase64?: boolean
  chatwootAccountId?: string | null
  chatwootToken?: string | null
  chatwootUrl?: string | null
  chatwootSignMsg?: boolean
  chatwootReopenConversation?: boolean
  chatwootConversationPending?: boolean
}

export interface EvolutionApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string
}