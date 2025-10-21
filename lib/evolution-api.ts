import type { 
  EvolutionInstance, 
  EvolutionQRCode, 
  EvolutionMessage, 
  EvolutionCreateInstanceRequest,
  EvolutionApiResponse 
} from './evolution-types'

const EVOLUTION_API_URL = "https://api.qroagenda.com"

class EvolutionAPI {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'DELETE' | 'PUT' = 'GET',
    body?: any
  ): Promise<EvolutionApiResponse<T>> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        let errorData
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          errorData = await response.json()
          
          // Parse error messages for better feedback
          if (errorData.response?.message && Array.isArray(errorData.response.message)) {
            const messages = errorData.response.message.flat()
            errorMessage = `Validation Error: ${messages.join(', ')}`
          } else if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          errorData = await response.text()
        }

        console.error(`🚨 Evolution API Error (${method} ${endpoint}):`, {
          status: response.status,
          statusText: response.statusText,
          url: `${EVOLUTION_API_URL}${endpoint}`,
          requestBody: body,
          errorResponse: errorData
        })

        return {
          success: false,
          error: errorMessage,
          details: errorData
        }
      }

      const data = await response.json()
      return {
        success: true,
        data
      }
    } catch (error) {
      console.error(`🚨 Evolution API Network Error (${method} ${endpoint}):`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint,
        method,
        requestBody: body
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  // Create instance
  async createInstance(instanceName: string, webhookUrl?: string): Promise<EvolutionApiResponse<EvolutionInstance>> {
    const requestBody: Partial<EvolutionCreateInstanceRequest> = {
      instanceName,
      token: this.apiKey,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhookUrl: webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/evolution/webhook`,
      webhookByEvents: false,
      webhookBase64: false,
      chatwootSignMsg: false,
      chatwootReopenConversation: false,
      chatwootConversationPending: false
      // Omitindo campos chatwoot nulos para evitar erros de validação
    }

    return this.makeRequest<EvolutionInstance>('/instance/create', 'POST', requestBody)
  }

  // Get QR code
  async getQRCode(instanceName: string): Promise<EvolutionApiResponse<EvolutionQRCode>> {
    return this.makeRequest<EvolutionQRCode>(`/instance/connect/${instanceName}`)
  }

  // Get instance status
  async getInstanceStatus(instanceName: string): Promise<EvolutionApiResponse<{ state: string }>> {
    return this.makeRequest<{ state: string }>(`/instance/connectionState/${instanceName}`)
  }

  // Send text message
  async sendMessage(instanceName: string, message: EvolutionMessage): Promise<EvolutionApiResponse<any>> {
    return this.makeRequest(`/message/sendText/${instanceName}`, 'POST', message)
  }

  // Get all instances
  async getAllInstances(): Promise<EvolutionApiResponse<EvolutionInstance[]>> {
    return this.makeRequest<EvolutionInstance[]>('/instance/fetchInstances')
  }

  // Delete instance
  async deleteInstance(instanceName: string): Promise<EvolutionApiResponse<any>> {
    return this.makeRequest(`/instance/delete/${instanceName}`, 'DELETE')
  }

  // Logout instance
  async logoutInstance(instanceName: string): Promise<EvolutionApiResponse<any>> {
    return this.makeRequest(`/instance/logout/${instanceName}`, 'DELETE')
  }

  // Restart instance
  async restartInstance(instanceName: string): Promise<EvolutionApiResponse<any>> {
    return this.makeRequest(`/instance/restart/${instanceName}`, 'PUT')
  }
}

// Export singleton instance
export const evolutionAPI = new EvolutionAPI(process.env.EVOLUTION_API_KEY || '')

// Export class for custom instances
export { EvolutionAPI }