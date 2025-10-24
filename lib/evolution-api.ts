import axios, { AxiosInstance } from 'axios'
import type {
    EvolutionInstance,
    EvolutionQRCode,
    EvolutionMessage,
    EvolutionCreateInstanceRequest,
    EvolutionApiResponse
} from './evolution-types'
import { adminDb } from './firebase-admin'

const EVOLUTION_API_URL = process.env.EVOLUTION_BASE_URL || 'https://api.qroagenda.com'

function formatPhoneNumber(phone: string): string {
    const clean = String(phone || '').replace(/\D/g, '')
    if (!clean) return ''
    return clean.startsWith('55') ? clean : `55${clean}`
}

class EvolutionAPI {
    private apiKey: string
    private axios: AxiosInstance

    constructor(apiKey: string) {
        this.apiKey = apiKey || ''
        this.axios = axios.create({
            baseURL: EVOLUTION_API_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.apiKey
            }
        })

        // simple logging interceptors
        this.axios.interceptors.request.use((cfg: any) => {
            // eslint-disable-next-line no-console
            console.log(`🔄 Evolution API Request: ${cfg.method?.toUpperCase()} ${cfg.url}`)
            return cfg
        }, (err: any) => Promise.reject(err))
        this.axios.interceptors.response.use((res: any) => {
            // eslint-disable-next-line no-console
            console.log(`✅ Evolution API Response: ${res.status} ${String(res.config.url)}`)
            return res
        }, (err: any) => {
            // eslint-disable-next-line no-console
            console.error('❌ Evolution API Response Error:', err?.response?.status, err?.response?.data || err?.message)
            return Promise.reject(err)
        })
    }

    private parseAxiosError(err: any) {
        let errorMessage = 'Unknown error'
        let details: any = undefined
        if (err && err.response && err.response.data) {
            details = err.response.data
            if (err.response.data.response?.message) {
                const msg = err.response.data.response.message
                errorMessage = Array.isArray(msg) ? msg.flat().join(', ') : String(msg)
            } else if (err.response.data.message) {
                errorMessage = String(err.response.data.message)
            } else if (err.response.data.error) {
                errorMessage = String(err.response.data.error)
            }
        } else if (err instanceof Error) {
            errorMessage = err.message
        }
        return { errorMessage, details }
    }

    // Checa no Firestore se a instância está OPEN/CONNECTED (coleção evolutionInstances)
    private async isInstanceConnected(instanceName: string): Promise<boolean> {
        try {
            const q = await adminDb.collection('evolutionInstances').where('instanceName', '==', instanceName).limit(1).get()
            if (!q.empty) {
                const data = q.docs[0].data() as any
                const status = String(data.status || '').toUpperCase()
                return status === 'OPEN' || status === 'CONNECTED'
            }
            return false
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error checking evolution instance status in Firestore:', err)
            return false
        }
    }

    private async request<T>(method: 'get' | 'post' | 'put' | 'delete', endpoint: string, body?: any): Promise<EvolutionApiResponse<T>> {
        try {
            const res = await this.axios.request({ method, url: endpoint, data: body })
            return { success: true, data: res.data }
        } catch (err) {
            const { errorMessage, details } = this.parseAxiosError(err)
            return { success: false, error: errorMessage, details }
        }
    }

    // Create instance
    async createInstance(instanceName: string, webhookUrl?: string): Promise<EvolutionApiResponse<EvolutionInstance>> {
        const requestBody: Partial<EvolutionCreateInstanceRequest> = {
            instanceName,
            token: this.apiKey,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhookUrl: webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/evolution/webhook`,
            webhookByEvents: false,
            webhookBase64: false,
            chatwootSignMsg: false,
            chatwootReopenConversation: false,
            chatwootConversationPending: false
        }
        return this.request<EvolutionInstance>('post', '/instance/create', requestBody)
    }

    async getQRCode(instanceName: string): Promise<EvolutionApiResponse<EvolutionQRCode>> {
        return this.request<EvolutionQRCode>('get', `/instance/connect/${instanceName}`)
    }

    async getInstanceStatus(instanceName: string): Promise<EvolutionApiResponse<{ state: string }>> {
        return this.request('get', `/instance/connectionState/${instanceName}`)
    }

    // sendMessage: decide between text/media depending on payload
    async sendMessage(instanceName: string, message: any): Promise<EvolutionApiResponse<any>> {
        // Ensure instance is connected according to Firestore status
        const connected = await this.isInstanceConnected(instanceName)
        if (!connected) {
            return { success: false, error: 'Instância não está OPEN ou CONNECTED na base de dados.' }
        }

        try {
            const numberRaw = message?.number || message?.to || message?.phone || ''
            const number = formatPhoneNumber(String(numberRaw || ''))
            if (!number) return { success: false, error: 'Número inválido' }

            // If media field present, call sendMedia endpoint
            if (message?.media || message?.mediatype || message?.caption) {
                const payload = {
                    number,
                    caption: message.caption || message.text || message.caption || '',
                    media: message.media || message.imageUrl || message.url,
                    mediatype: message.mediatype || message.mediaType || undefined
                }
                return this.request('post', `/message/sendMedia/${instanceName}`, payload)
            }

            // default to text
            const text = message?.text || message?.body || message?.message || ''
            const payload = {
                number,
                text
            }
            return this.request('post', `/message/sendText/${instanceName}`, payload)
        } catch (err) {
            const { errorMessage, details } = this.parseAxiosError(err)
            return { success: false, error: errorMessage, details }
        }
    }

    async getAllInstances(): Promise<EvolutionApiResponse<EvolutionInstance[]>> {
        return this.request<EvolutionInstance[]>('get', '/instance/fetchInstances')
    }

    async deleteInstance(instanceName: string): Promise<EvolutionApiResponse<any>> {
        return this.request('delete', `/instance/delete/${instanceName}`)
    }

    async logoutInstance(instanceName: string): Promise<EvolutionApiResponse<any>> {
        return this.request('delete', `/instance/logout/${instanceName}`)
    }

    async restartInstance(instanceName: string): Promise<EvolutionApiResponse<any>> {
        return this.request('put', `/instance/restart/${instanceName}`)
    }
}

export const evolutionAPI = new EvolutionAPI(process.env.EVOLUTION_API_KEY || '')
export { EvolutionAPI }