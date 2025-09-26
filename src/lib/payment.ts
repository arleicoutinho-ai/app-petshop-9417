import { PaymentResponse } from './types';

// Simulação da API do Mercado Pago
// Em produção, você precisará configurar suas credenciais reais
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-TOKEN';

export const generatePixPayment = async (amount: number, description: string): Promise<PaymentResponse> => {
  try {
    // Simulação - em produção usar a API real do Mercado Pago
    const mockResponse = {
      success: true,
      qrCode: `00020126580014br.gov.bcb.pix0136${Date.now()}@mercadopago.com.br5204000053039865802BR5925Pet Show e Cia6009SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      pixId: `pix_${Date.now()}`
    };
    
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockResponse;
  } catch (error) {
    return {
      success: false,
      error: 'Erro ao gerar pagamento PIX'
    };
  }
};

export const checkPixPaymentStatus = async (pixId: string): Promise<{ paid: boolean; error?: string }> => {
  try {
    // Simulação - em produção verificar status real via API
    // Para demonstração, vamos simular que o pagamento é aprovado após 10 segundos
    const createdTime = parseInt(pixId.replace('pix_', ''));
    const now = Date.now();
    const elapsed = now - createdTime;
    
    // Simular aprovação após 10 segundos
    const paid = elapsed > 10000;
    
    return { paid };
  } catch (error) {
    return {
      paid: false,
      error: 'Erro ao verificar status do pagamento'
    };
  }
};

// Função para imprimir cupom não fiscal
export const printReceipt = async (saleData: any): Promise<boolean> => {
  try {
    // Simulação da impressão
    // Em produção, você integraria com uma biblioteca de impressão
    // como node-thermal-printer ou similar
    
    console.log('=== CUPOM NÃO FISCAL ===');
    console.log('Pet Show e Cia');
    console.log('Data:', new Date().toLocaleString('pt-BR'));
    console.log('Venda #:', saleData.id);
    console.log('------------------------');
    
    saleData.items.forEach((item: any) => {
      console.log(`${item.product.name}`);
      console.log(`${item.quantity}x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.total.toFixed(2)}`);
    });
    
    console.log('------------------------');
    console.log(`Subtotal: R$ ${saleData.subtotal.toFixed(2)}`);
    if (saleData.discount > 0) {
      console.log(`Desconto: R$ ${saleData.discount.toFixed(2)}`);
    }
    if (saleData.deliveryFee > 0) {
      console.log(`Taxa Delivery: R$ ${saleData.deliveryFee.toFixed(2)}`);
    }
    console.log(`TOTAL: R$ ${saleData.total.toFixed(2)}`);
    console.log(`Pagamento: ${saleData.paymentMethod.toUpperCase()}`);
    console.log('========================');
    
    return true;
  } catch (error) {
    console.error('Erro ao imprimir cupom:', error);
    return false;
  }
};

// Função para abrir gaveta
export const openCashDrawer = async (): Promise<boolean> => {
  try {
    // Simulação da abertura da gaveta
    // Em produção, você enviaria o comando ESC/POS para a impressora
    // Comando típico: ESC p m t1 t2 (0x1B 0x70 0x00 0x19 0x19)
    
    console.log('🔓 Gaveta aberta!');
    
    // Simular delay da abertura
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error) {
    console.error('Erro ao abrir gaveta:', error);
    return false;
  }
};