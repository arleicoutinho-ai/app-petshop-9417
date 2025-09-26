// Tipos de produtos
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  barcode?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiryDate?: Date;
}

// Tipos de vendas
export interface SaleItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'pix' | 'credit';
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  pixQrCode?: string;
  pixId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  isDelivery: boolean;
  deliveryFee: number;
  createdAt: Date;
  paidAt?: Date;
  userId: string;
  userName: string;
}

// Tipos de orçamentos
export interface Quote {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  validUntil: Date;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  notes: string;
  createdAt: Date;
  userId: string;
  userName: string;
}

// Tipos de clientes
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  cpf?: string;
  birthDate?: Date;
  petName?: string;
  petBreed?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de usuários e autenticação
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'seller' | 'cashier';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

// Tipos de configurações do sistema
export interface SystemConfig {
  id: string;
  // Configurações da empresa
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyCnpj?: string;
  
  // Configurações de impressora
  printerEnabled: boolean;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  
  // Configurações de pagamento
  mercadoPagoToken?: string;
  mercadoPagoPublicKey?: string;
  pixEnabled: boolean;
  
  // Configurações de delivery
  deliveryEnabled: boolean;
  defaultDeliveryFee: number;
  deliveryRadius: number;
  
  // Configurações de estoque
  lowStockAlert: boolean;
  expiryAlert: boolean;
  expiryDays: number;
  
  // Configurações de WhatsApp/SMS
  whatsappEnabled: boolean;
  whatsappToken?: string;
  smsEnabled: boolean;
  smsToken?: string;
  
  updatedAt: Date;
  updatedBy: string;
}

// Tipos para entregas
export interface Delivery {
  id: string;
  orderId: string;
  saleId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'nearby' | 'delivered';
  createdAt: Date;
  deliveredAt?: Date;
  items: SaleItem[];
  total: number;
  deliveryFee: number;
  notes?: string;
  userId: string;
  userName: string;
}

// Tipos para relatórios
export interface SalesReport {
  period: string;
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
  }>;
}