import { Product, Sale, Quote, StockMovement, Customer } from './types';

// Simulação de dados - em produção seria conectado ao banco de dados
let products: Product[] = [
  {
    id: '1',
    name: 'Ração Golden Adulto 15kg',
    description: 'Ração premium para cães adultos',
    price: 89.90,
    cost: 65.00,
    barcode: '7891234567890',
    category: 'Ração Cães',
    brand: 'Golden',
    stock: 25,
    minStock: 5,
    expiryDate: new Date('2025-06-15'),
    supplier: 'Premier Pet',
    unit: 'kg',
    weight: 15,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Ração Whiskas Gatos 3kg',
    description: 'Ração para gatos adultos sabor peixe',
    price: 32.90,
    cost: 24.00,
    barcode: '7891234567891',
    category: 'Ração Gatos',
    brand: 'Whiskas',
    stock: 18,
    minStock: 3,
    expiryDate: new Date('2025-04-20'),
    supplier: 'Mars Petcare',
    unit: 'kg',
    weight: 3,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Brinquedo Corda Cães',
    description: 'Brinquedo de corda para cães pequenos e médios',
    price: 15.90,
    cost: 8.50,
    barcode: '7891234567892',
    category: 'Brinquedos',
    brand: 'Pet Toys',
    stock: 12,
    minStock: 2,
    supplier: 'Distribuidora Pet',
    unit: 'un',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let sales: Sale[] = [];
let quotes: Quote[] = [];
let stockMovements: StockMovement[] = [];
let customers: Customer[] = [];

// Produtos
export const getProducts = (): Product[] => products;

export const getProductById = (id: string): Product | undefined => 
  products.find(p => p.id === id);

export const getProductByBarcode = (barcode: string): Product | undefined => 
  products.find(p => p.barcode === barcode);

export const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
  const newProduct: Product = {
    ...product,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  products.push(newProduct);
  return newProduct;
};

export const updateProduct = (id: string, updates: Partial<Product>): Product | null => {
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  products[index] = { ...products[index], ...updates, updatedAt: new Date() };
  return products[index];
};

export const updateStock = (productId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string, reference?: string) => {
  const product = products.find(p => p.id === productId);
  if (!product) return false;

  const movement: StockMovement = {
    id: Date.now().toString(),
    productId,
    type,
    quantity: Math.abs(quantity),
    reason,
    reference,
    createdAt: new Date()
  };

  if (type === 'in' || type === 'adjustment') {
    product.stock += Math.abs(quantity);
  } else {
    product.stock -= Math.abs(quantity);
  }

  stockMovements.push(movement);
  product.updatedAt = new Date();
  return true;
};

// Vendas
export const getSales = (): Sale[] => sales;

export const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>): Sale => {
  const newSale: Sale = {
    ...sale,
    id: Date.now().toString(),
    createdAt: new Date()
  };
  
  // Atualizar estoque
  sale.items.forEach(item => {
    updateStock(item.productId, item.quantity, 'out', `Venda #${newSale.id}`, newSale.id);
  });
  
  sales.push(newSale);
  return newSale;
};

export const updateSalePaymentStatus = (saleId: string, status: Sale['paymentStatus'], completedAt?: Date): Sale | null => {
  const sale = sales.find(s => s.id === saleId);
  if (!sale) return null;
  
  sale.paymentStatus = status;
  if (completedAt) sale.completedAt = completedAt;
  
  return sale;
};

// Orçamentos
export const getQuotes = (): Quote[] => quotes;

export const addQuote = (quote: Omit<Quote, 'id' | 'createdAt'>): Quote => {
  const newQuote: Quote = {
    ...quote,
    id: Date.now().toString(),
    createdAt: new Date()
  };
  quotes.push(newQuote);
  return newQuote;
};

export const convertQuoteToSale = (quoteId: string): Sale | null => {
  const quote = quotes.find(q => q.id === quoteId);
  if (!quote) return null;
  
  const sale = addSale({
    items: quote.items,
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    isDelivery: false,
    deliveryFee: 0
  });
  
  // Marcar orçamento como convertido
  quote.status = 'converted';
  
  return sale;
};

// Clientes
export const getCustomers = (): Customer[] => customers;

export const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
  const newCustomer: Customer = {
    ...customer,
    id: Date.now().toString(),
    createdAt: new Date()
  };
  customers.push(newCustomer);
  return newCustomer;
};

// Relatórios
export const getLowStockProducts = (): Product[] => 
  products.filter(p => p.stock <= p.minStock && p.active);

export const getExpiringProducts = (days: number = 30): Product[] => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return products.filter(p => 
    p.expiryDate && 
    p.expiryDate <= futureDate && 
    p.active
  );
};

export const getSalesReport = (startDate: Date, endDate: Date) => {
  const filteredSales = sales.filter(s => 
    s.createdAt >= startDate && 
    s.createdAt <= endDate &&
    s.paymentStatus === 'paid'
  );
  
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalItems = filteredSales.reduce((sum, sale) => 
    sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );
  
  return {
    totalSales,
    totalItems,
    salesCount: filteredSales.length,
    averageTicket: filteredSales.length > 0 ? totalSales / filteredSales.length : 0
  };
};