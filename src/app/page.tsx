"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  Scan,
  CreditCard,
  Printer,
  DollarSign,
  Plus,
  Minus,
  Search,
  Truck,
  Home,
  Bell,
  MessageSquare,
  MapPin,
  CheckCircle,
  Clock,
  Send,
  Phone,
  Settings,
  LogOut,
  Eye,
  EyeOff,
  Save,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Key,
  BarChart3,
  Download,
  Filter,
  Mail,
  MapPinIcon,
  Star,
  Archive,
  RefreshCw
} from 'lucide-react';

import { Product, Sale, SaleItem, Quote, Customer, User, AuthSession, SystemConfig } from '@/lib/types';
import { 
  getProducts, 
  getProductByBarcode, 
  addSale, 
  addQuote, 
  addCustomer,
  getLowStockProducts,
  getExpiringProducts,
  getSalesReport,
  updateSalePaymentStatus
} from '@/lib/database';
import { generatePixPayment, checkPixPaymentStatus, printReceipt, openCashDrawer } from '@/lib/payment';
import { 
  initializeAuth,
  login,
  logout,
  getCurrentSession,
  isAuthenticated,
  hasPermission,
  getUsers,
  addUser,
  updateUser,
  changePassword,
  getRoleName,
  getRolePermissions,
  getSystemConfig,
  saveSystemConfig
} from '@/lib/auth';

// Tipos para entregas
interface Delivery {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'nearby' | 'delivered';
  createdAt: Date;
  items: SaleItem[];
  total: number;
}

// Componente de Login
function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const session = login(email, password);
      if (session) {
        onLogin(session);
        toast.success(`Bem-vindo, ${session.user.name}!`);
      } else {
        toast.error('Email ou senha incorretos');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Pet Show e Cia</CardTitle>
          <CardDescription>Sistema de Gestão Completo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Usuários de teste:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><strong>Admin:</strong> admin@petshow.com / admin123</p>
              <p><strong>Vendedor:</strong> vendedor@petshow.com / vendedor123</p>
              <p><strong>Caixa:</strong> caixa@petshow.com / caixa123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PetShopPDV() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customer, setCustomer] = useState<Partial<Customer>>({});
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix' | 'credit'>('cash');
  const [pixQrCode, setPixQrCode] = useState('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Estados para finalização de venda
  const [showSaleComplete, setShowSaleComplete] = useState(false);
  const [saleCompleteData, setSaleCompleteData] = useState<{
    total: number;
    paymentMethod: string;
    amountPaid?: number;
    change?: number;
  } | null>(null);

  // Estados para dashboard
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [messageText, setMessageText] = useState('');

  // Estados para configurações
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig());
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Estados para produtos
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Estados para clientes
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Estados para orçamentos
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState('all');

  // Estados para relatórios
  const [reportType, setReportType] = useState('sales');
  const [reportPeriod, setReportPeriod] = useState('today');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    initializeAuth();
    const currentSession = getCurrentSession();
    if (currentSession) {
      setSession(currentSession);
    }
  }, []);

  useEffect(() => {
    if (session) {
      setProducts(getProducts());
      setLowStockProducts(getLowStockProducts());
      setExpiringProducts(getExpiringProducts());
      setUsers(getUsers());
      
      // Simular dados para desenvolvimento
      setCustomers([
        {
          id: '1',
          name: 'Maria Silva',
          email: 'maria@email.com',
          phone: '(11) 99999-9999',
          address: 'Rua das Flores, 123 - Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          birthDate: new Date('1985-05-15'),
          petName: 'Rex',
          petBreed: 'Golden Retriever',
          notes: 'Cliente VIP',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'João Santos',
          email: 'joao@email.com',
          phone: '(11) 88888-8888',
          address: 'Av. Principal, 456 - Jardim',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-568',
          birthDate: new Date('1990-08-20'),
          petName: 'Mimi',
          petBreed: 'Persa',
          notes: 'Gato muito dócil',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      setQuotes([
        {
          id: '1',
          items: [],
          subtotal: 150.00,
          discount: 10.00,
          total: 140.00,
          customerName: 'Maria Silva',
          customerPhone: '(11) 99999-9999',
          customerEmail: 'maria@email.com',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'active',
          notes: 'Orçamento para ração premium',
          userId: session.user.id,
          userName: session.user.name,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      // Simular entregas pendentes
      setPendingDeliveries([
        {
          id: '1',
          orderId: '#001',
          customerName: 'Maria Silva',
          customerPhone: '(11) 99999-9999',
          address: 'Rua das Flores, 123 - Centro',
          status: 'pending',
          createdAt: new Date(),
          items: [],
          total: 89.90
        },
        {
          id: '2',
          orderId: '#002',
          customerName: 'João Santos',
          customerPhone: '(11) 88888-8888',
          address: 'Av. Principal, 456 - Jardim',
          status: 'confirmed',
          createdAt: new Date(),
          items: [],
          total: 156.50
        }
      ]);
    }
  }, [session]);

  // Se não estiver logado, mostrar tela de login
  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  // Filtrar produtos
  const filteredProducts = products.filter(product =>
    product.active && (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Filtrar produtos para gestão
  const filteredProductsManagement = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                         product.barcode?.includes(productSearchTerm) ||
                         product.category.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filtrar clientes
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone?.includes(customerSearchTerm) ||
    customer.petName?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // Filtrar orçamentos
  const filteredQuotes = quotes.filter(quote => {
    if (quoteFilter === 'all') return true;
    return quote.status === quoteFilter;
  });

  // Obter categorias únicas
  const categories = [...new Set(products.map(p => p.category))];

  // Adicionar produto ao carrinho via código de barras
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    const product = getProductByBarcode(barcode);
    if (product) {
      addToCart(product);
      setBarcode('');
      toast.success(`${product.name} adicionado ao carrinho`);
    } else {
      toast.error('Produto não encontrado');
    }
  };

  // Adicionar produto ao carrinho
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Produto sem estoque');
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Estoque insuficiente');
        return;
      }
      
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        total: product.price
      };
      setCart([...cart, newItem]);
    }
  };

  // Remover produto do carrinho
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Atualizar quantidade no carrinho
  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product || quantity > product.stock) {
      toast.error('Estoque insuficiente');
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity, total: quantity * item.unitPrice }
        : item
    ));
  };

  // Calcular totais
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = discount;
  const total = subtotal - totalDiscount + (isDelivery ? deliveryFee : 0);

  // Processar venda
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    setIsProcessingPayment(true);

    try {
      let pixQrCodeData = '';
      let pixId = '';

      // Se for PIX, gerar QR Code
      if (paymentMethod === 'pix') {
        const pixResponse = await generatePixPayment(total, 'Compra Pet Shop');
        if (!pixResponse.success) {
          toast.error(pixResponse.error || 'Erro ao gerar PIX');
          setIsProcessingPayment(false);
          return;
        }
        pixQrCodeData = pixResponse.qrCode || '';
        pixId = pixResponse.pixId || '';
        setPixQrCode(pixQrCodeData);
      }

      // Criar venda
      const sale = addSale({
        items: cart,
        subtotal,
        discount: totalDiscount,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'pix' ? 'pending' : 'paid',
        pixQrCode: pixQrCodeData,
        pixId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: isDelivery ? customer.address : undefined,
        isDelivery,
        deliveryFee: isDelivery ? deliveryFee : 0,
        userId: session.user.id,
        userName: session.user.name
      });

      setCurrentSale(sale);

      // Se for PIX, aguardar confirmação
      if (paymentMethod === 'pix') {
        toast.info('Aguardando pagamento PIX...');
        
        // Verificar status do pagamento a cada 3 segundos
        const checkPayment = setInterval(async () => {
          const status = await checkPixPaymentStatus(pixId);
          if (status.paid) {
            clearInterval(checkPayment);
            updateSalePaymentStatus(sale.id, 'paid', new Date());
            await completeSale(sale);
          }
        }, 3000);

        // Parar verificação após 5 minutos
        setTimeout(() => {
          clearInterval(checkPayment);
          if (sale.paymentStatus === 'pending') {
            updateSalePaymentStatus(sale.id, 'cancelled');
            toast.error('Pagamento PIX expirado');
            setIsProcessingPayment(false);
          }
        }, 300000);
      } else {
        await completeSale(sale);
      }
    } catch (error) {
      toast.error('Erro ao processar venda');
      setIsProcessingPayment(false);
    }
  };

  // Completar venda
  const completeSale = async (sale: Sale) => {
    try {
      // Se for pagamento em dinheiro, mostrar tela de troco
      if (sale.paymentMethod === 'cash') {
        setSaleCompleteData({
          total: sale.total,
          paymentMethod: 'Dinheiro'
        });
        setShowSaleComplete(true);
        setIsProcessingPayment(false);
        return;
      }

      // Para outros métodos, finalizar diretamente
      await finalizeSale(sale);
    } catch (error) {
      toast.error('Erro ao finalizar venda');
      setIsProcessingPayment(false);
    }
  };

  // Finalizar venda (após confirmação de troco ou diretamente)
  const finalizeSale = async (sale: Sale, amountPaid?: number) => {
    try {
      // Imprimir cupom
      await printReceipt(sale);
      
      // Abrir gaveta (apenas para dinheiro)
      if (sale.paymentMethod === 'cash') {
        await openCashDrawer();
      }

      toast.success('Venda realizada com sucesso!');
      
      // Limpar carrinho e dados
      setCart([]);
      setCustomer({});
      setIsDelivery(false);
      setDeliveryFee(0);
      setDiscount(0);
      setPixQrCode('');
      setCurrentSale(null);
      setIsProcessingPayment(false);
      setShowSaleComplete(false);
      setSaleCompleteData(null);
      
      // Atualizar lista de produtos
      setProducts(getProducts());
    } catch (error) {
      toast.error('Erro ao finalizar venda');
      setIsProcessingPayment(false);
    }
  };

  // Nova venda
  const startNewSale = () => {
    setCart([]);
    setCustomer({});
    setIsDelivery(false);
    setDeliveryFee(0);
    setDiscount(0);
    setPixQrCode('');
    setCurrentSale(null);
    setIsProcessingPayment(false);
    setShowSaleComplete(false);
    setSaleCompleteData(null);
    toast.success('Nova venda iniciada!');
  };

  // Imprimir cupom
  const printSaleReceipt = async () => {
    if (currentSale) {
      try {
        await printReceipt(currentSale);
        toast.success('Cupom impresso com sucesso!');
      } catch (error) {
        toast.error('Erro ao imprimir cupom');
      }
    }
  };

  // Criar orçamento
  const createQuote = () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    if (!customer.name) {
      toast.error('Nome do cliente é obrigatório para orçamento');
      return;
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // Válido por 7 dias

    const quote = addQuote({
      items: cart,
      subtotal,
      discount: totalDiscount,
      total,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      validUntil,
      status: 'active',
      notes: '',
      userId: session.user.id,
      userName: session.user.name
    });

    toast.success('Orçamento criado com sucesso!');
    
    // Limpar carrinho
    setCart([]);
    setCustomer({});
    setDiscount(0);
  };

  // Atualizar status da entrega
  const updateDeliveryStatus = (deliveryId: string, newStatus: Delivery['status']) => {
    setPendingDeliveries(deliveries =>
      deliveries.map(delivery =>
        delivery.id === deliveryId
          ? { ...delivery, status: newStatus }
          : delivery
      )
    );
    
    const delivery = pendingDeliveries.find(d => d.id === deliveryId);
    if (delivery) {
      toast.success(`Status atualizado: ${getStatusText(newStatus)}`);
    }
  };

  // Enviar mensagem para cliente
  const sendMessageToCustomer = (delivery: Delivery, message: string) => {
    // Em produção, aqui seria integrado com WhatsApp API ou SMS
    console.log(`Enviando mensagem para ${delivery.customerPhone}: ${message}`);
    toast.success(`Mensagem enviada para ${delivery.customerName}`);
    setMessageText('');
  };

  // Obter texto do status
  const getStatusText = (status: Delivery['status']) => {
    const statusMap = {
      'pending': 'Pendente',
      'confirmed': 'Confirmado',
      'out_for_delivery': 'Saiu para entrega',
      'nearby': 'Próximo ao destino',
      'delivered': 'Entregue'
    };
    return statusMap[status];
  };

  // Obter cor do status
  const getStatusColor = (status: Delivery['status']) => {
    const colorMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'out_for_delivery': 'bg-purple-100 text-purple-800',
      'nearby': 'bg-orange-100 text-orange-800',
      'delivered': 'bg-green-100 text-green-800'
    };
    return colorMap[status];
  };

  // Mensagens pré-definidas
  const getPresetMessage = (status: Delivery['status'], customerName: string) => {
    const messages = {
      'confirmed': `Olá ${customerName}! Seu pedido foi confirmado e está sendo preparado. Em breve sairá para entrega! 🐾`,
      'out_for_delivery': `${customerName}, seu pedido saiu da loja e está a caminho! Nosso entregador chegará em breve. 🚚`,
      'nearby': `${customerName}, nosso entregador está próximo à sua localização! Prepare-se para receber seu pedido. 📍`,
      'delivered': `${customerName}, obrigado por escolher a Pet Show e Cia! Seu pedido foi entregue com sucesso. Esperamos que seu pet aproveite! ❤️🐾`
    };
    return messages[status] || '';
  };

  // Salvar configurações
  const handleSaveConfig = () => {
    saveSystemConfig(systemConfig);
    toast.success('Configurações salvas com sucesso!');
  };

  // Adicionar novo usuário
  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role || !newPassword) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (addUser(newUser as Omit<User, 'id' | 'createdAt' | 'updatedAt'>, newPassword)) {
      toast.success('Usuário adicionado com sucesso!');
      setUsers(getUsers());
      setNewUser({});
      setNewPassword('');
      setShowUserDialog(false);
    } else {
      toast.error('Erro ao adicionar usuário. Email já existe?');
    }
  };

  // Alterar senha
  const handleChangePassword = () => {
    if (!selectedUser || !newPassword) {
      toast.error('Selecione um usuário e digite a nova senha');
      return;
    }

    if (changePassword(selectedUser.id, newPassword)) {
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setShowPasswordDialog(false);
      setSelectedUser(null);
    } else {
      toast.error('Erro ao alterar senha');
    }
  };

  // Salvar produto
  const handleSaveProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Simular salvamento (em produção seria no banco)
    const productToSave = {
      ...newProduct,
      id: selectedProduct?.id || Date.now().toString(),
      active: newProduct.active ?? true,
      stock: newProduct.stock || 0,
      minStock: newProduct.minStock || 5,
      createdAt: selectedProduct?.createdAt || new Date(),
      updatedAt: new Date()
    } as Product;

    if (selectedProduct) {
      // Atualizar produto existente
      setProducts(products.map(p => p.id === selectedProduct.id ? productToSave : p));
      toast.success('Produto atualizado com sucesso!');
    } else {
      // Adicionar novo produto
      setProducts([...products, productToSave]);
      toast.success('Produto adicionado com sucesso!');
    }

    setNewProduct({});
    setSelectedProduct(null);
    setShowProductDialog(false);
  };

  // Salvar cliente
  const handleSaveCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    const customerToSave = {
      ...newCustomer,
      id: selectedCustomer?.id || Date.now().toString(),
      createdAt: selectedCustomer?.createdAt || new Date(),
      updatedAt: new Date()
    } as Customer;

    if (selectedCustomer) {
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? customerToSave : c));
      toast.success('Cliente atualizado com sucesso!');
    } else {
      setCustomers([...customers, customerToSave]);
      toast.success('Cliente adicionado com sucesso!');
    }

    setNewCustomer({});
    setSelectedCustomer(null);
    setShowCustomerDialog(false);
  };

  // Gerar relatório
  const generateReport = () => {
    // Simular geração de relatório
    const mockData = {
      sales: {
        today: { total: 1247.50, count: 15, avgTicket: 83.17 },
        week: { total: 8532.30, count: 98, avgTicket: 87.07 },
        month: { total: 35420.80, count: 412, avgTicket: 86.02 }
      },
      products: {
        topSelling: [
          { name: 'Ração Premium Cães', quantity: 45, revenue: 2250.00 },
          { name: 'Areia Sanitária', quantity: 32, revenue: 960.00 },
          { name: 'Brinquedo Corda', quantity: 28, revenue: 420.00 }
        ],
        lowStock: lowStockProducts.length,
        expiring: expiringProducts.length
      },
      customers: {
        total: customers.length,
        new: 5,
        returning: 12
      }
    };

    setReportData(mockData);
    toast.success('Relatório gerado com sucesso!');
  };

  // Fazer logout
  const handleLogout = () => {
    logout();
    setSession(null);
    toast.success('Logout realizado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pet Show e Cia - Sistema Completo</h1>
            <p className="text-gray-600">Bem-vindo, {session.user.name} ({getRoleName(session.user.role)})</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Dialog de Finalização de Venda */}
        <Dialog open={showSaleComplete} onOpenChange={setShowSaleComplete}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold text-green-600">
                Venda Finalizada!
              </DialogTitle>
            </DialogHeader>
            
            {saleCompleteData && (
              <div className="space-y-6">
                <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    R$ {saleCompleteData.total.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Pagamento: {saleCompleteData.paymentMethod}
                  </div>
                </div>

                {saleCompleteData.paymentMethod === 'Dinheiro' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amountPaid">Valor Recebido (R$)</Label>
                      <Input
                        id="amountPaid"
                        type="number"
                        step="0.01"
                        min={saleCompleteData.total}
                        placeholder={saleCompleteData.total.toFixed(2)}
                        onChange={(e) => {
                          const paid = Number(e.target.value);
                          const change = paid - saleCompleteData.total;
                          setSaleCompleteData({
                            ...saleCompleteData,
                            amountPaid: paid,
                            change: change >= 0 ? change : 0
                          });
                        }}
                        className="text-lg text-center"
                      />
                    </div>

                    {saleCompleteData.amountPaid && saleCompleteData.change !== undefined && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Troco</div>
                          <div className="text-2xl font-bold text-blue-600">
                            R$ {saleCompleteData.change.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      if (currentSale) {
                        finalizeSale(currentSale, saleCompleteData.amountPaid);
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={saleCompleteData.paymentMethod === 'Dinheiro' && (!saleCompleteData.amountPaid || saleCompleteData.amountPaid < saleCompleteData.total)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Venda
                  </Button>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button 
                    onClick={startNewSale}
                    variant="outline" 
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Venda
                  </Button>
                  
                  <Button 
                    onClick={printSaleReceipt}
                    variant="outline" 
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Cupom
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            {hasPermission('cashier') && (
              <TabsTrigger value="pdv" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                PDV
              </TabsTrigger>
            )}
            {hasPermission('seller') && (
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produtos
              </TabsTrigger>
            )}
            {hasPermission('seller') && (
              <TabsTrigger value="quotes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Orçamentos
              </TabsTrigger>
            )}
            {hasPermission('seller') && (
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Clientes
              </TabsTrigger>
            )}
            {hasPermission('seller') && (
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Relatórios
              </TabsTrigger>
            )}
            {hasPermission('admin') && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações
              </TabsTrigger>
            )}
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Resumo Geral */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Vendas Hoje</p>
                      <p className="text-2xl font-bold text-green-600">R$ 1.247,50</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Entregas Pendentes</p>
                      <p className="text-2xl font-bold text-blue-600">{pendingDeliveries.filter(d => d.status !== 'delivered').length}</p>
                    </div>
                    <Truck className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Estoque Baixo</p>
                      <p className="text-2xl font-bold text-red-600">{lowStockProducts.length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Vencendo</p>
                      <p className="text-2xl font-bold text-orange-600">{expiringProducts.length}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Avisos de Estoque */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Avisos de Estoque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {lowStockProducts.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nenhum produto com estoque baixo</p>
                      ) : (
                        lowStockProducts.map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                            <div>
                              <p className="font-medium text-red-800">{product.name}</p>
                              <p className="text-sm text-red-600">Estoque: {product.stock} unidades</p>
                            </div>
                            <Badge variant="destructive">{product.stock}</Badge>
                          </div>
                        ))
                      )}
                      
                      {expiringProducts.map((product) => (
                        <div key={`exp-${product.id}`} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div>
                            <p className="font-medium text-orange-800">{product.name}</p>
                            <p className="text-sm text-orange-600">Vence em: {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">Vencendo</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Entregas Pendentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-500" />
                    Entregas Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {pendingDeliveries.filter(d => d.status !== 'delivered').length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nenhuma entrega pendente</p>
                      ) : (
                        pendingDeliveries
                          .filter(delivery => delivery.status !== 'delivered')
                          .map((delivery) => (
                            <div key={delivery.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium text-blue-800">{delivery.customerName}</p>
                                  <p className="text-sm text-blue-600">{delivery.orderId} - R$ {delivery.total.toFixed(2)}</p>
                                </div>
                                <Badge className={getStatusColor(delivery.status)}>
                                  {getStatusText(delivery.status)}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{delivery.address}</p>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setSelectedDelivery(delivery)}
                                    >
                                      <MessageSquare className="w-3 h-3 mr-1" />
                                      Mensagem
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Enviar Mensagem</DialogTitle>
                                      <DialogDescription>
                                        Enviar mensagem para {delivery.customerName}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4" />
                                        {delivery.customerPhone}
                                      </div>
                                      
                                      {/* Botões de status */}
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Atualizar status e enviar mensagem:</p>
                                        <div className="grid grid-cols-2 gap-2">
                                          {delivery.status === 'pending' && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                updateDeliveryStatus(delivery.id, 'confirmed');
                                                sendMessageToCustomer(delivery, getPresetMessage('confirmed', delivery.customerName));
                                              }}
                                              className="bg-blue-600 hover:bg-blue-700"
                                            >
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Confirmar
                                            </Button>
                                          )}
                                          
                                          {delivery.status === 'confirmed' && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                updateDeliveryStatus(delivery.id, 'out_for_delivery');
                                                sendMessageToCustomer(delivery, getPresetMessage('out_for_delivery', delivery.customerName));
                                              }}
                                              className="bg-purple-600 hover:bg-purple-700"
                                            >
                                              <Truck className="w-3 h-3 mr-1" />
                                              Saiu
                                            </Button>
                                          )}
                                          
                                          {delivery.status === 'out_for_delivery' && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                updateDeliveryStatus(delivery.id, 'nearby');
                                                sendMessageToCustomer(delivery, getPresetMessage('nearby', delivery.customerName));
                                              }}
                                              className="bg-orange-600 hover:bg-orange-700"
                                            >
                                              <MapPin className="w-3 h-3 mr-1" />
                                              Próximo
                                            </Button>
                                          )}
                                          
                                          {(delivery.status === 'nearby' || delivery.status === 'out_for_delivery') && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                updateDeliveryStatus(delivery.id, 'delivered');
                                                sendMessageToCustomer(delivery, getPresetMessage('delivered', delivery.customerName));
                                              }}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Entregue
                                            </Button>
                                          )}
                                        </div>
                                      </div>

                                      <Separator />

                                      {/* Mensagem personalizada */}
                                      <div className="space-y-2">
                                        <Label htmlFor="custom-message">Mensagem personalizada:</Label>
                                        <Textarea
                                          id="custom-message"
                                          placeholder="Digite sua mensagem..."
                                          value={messageText}
                                          onChange={(e) => setMessageText(e.target.value)}
                                          rows={3}
                                        />
                                        <Button
                                          onClick={() => {
                                            if (messageText.trim()) {
                                              sendMessageToCustomer(delivery, messageText);
                                            }
                                          }}
                                          disabled={!messageText.trim()}
                                          className="w-full"
                                        >
                                          <Send className="w-4 h-4 mr-2" />
                                          Enviar Mensagem
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Entregas Finalizadas Hoje */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Entregas Finalizadas Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingDeliveries
                    .filter(delivery => delivery.status === 'delivered')
                    .map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-medium text-green-800">{delivery.customerName}</p>
                          <p className="text-sm text-green-600">{delivery.orderId} - R$ {delivery.total.toFixed(2)}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Entregue
                        </Badge>
                      </div>
                    ))}
                  {pendingDeliveries.filter(d => d.status === 'delivered').length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nenhuma entrega finalizada hoje</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PDV */}
          {hasPermission('cashier') && (
            <TabsContent value="pdv" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Produtos e Busca */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Busca por código de barras */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scan className="w-5 h-5" />
                        Código de Barras
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                        <Input
                          placeholder="Digite ou escaneie o código de barras"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="submit">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Busca de produtos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Buscar Produtos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        placeholder="Buscar por nome, categoria ou código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-4"
                      />
                      <ScrollArea className="h-96">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredProducts.map((product) => (
                            <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addToCart(product)}>
                              <CardContent className="p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-medium text-sm">{product.name}</h4>
                                  <Badge variant={product.stock > product.minStock ? "default" : "destructive"}>
                                    {product.stock}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{product.category}</p>
                                <p className="font-bold text-green-600">R$ {product.price.toFixed(2)}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Carrinho e Checkout */}
                <div className="space-y-4">
                  {/* Carrinho */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Carrinho ({cart.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64 mb-4">
                        {cart.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">Carrinho vazio</p>
                        ) : (
                          <div className="space-y-2">
                            {cart.map((item) => (
                              <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.product.name}</p>
                                  <p className="text-xs text-gray-600">R$ {item.unitPrice.toFixed(2)} cada</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="ml-2">
                                  <p className="font-bold text-sm">R$ {item.total.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      <Separator className="my-4" />

                      {/* Totais */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>R$ {subtotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <Label htmlFor="discount">Desconto:</Label>
                          <Input
                            id="discount"
                            type="number"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            className="w-20 h-8"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="delivery"
                            checked={isDelivery}
                            onChange={(e) => setIsDelivery(e.target.checked)}
                          />
                          <Label htmlFor="delivery" className="flex items-center gap-1">
                            <Truck className="w-4 h-4" />
                            Delivery
                          </Label>
                          {isDelivery && (
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Taxa"
                              value={deliveryFee}
                              onChange={(e) => setDeliveryFee(Number(e.target.value))}
                              className="w-20 h-8"
                            />
                          )}
                        </div>

                        <Separator />
                        
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span className="text-green-600">R$ {total.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dados do Cliente */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        placeholder="Nome do cliente"
                        value={customer.name || ''}
                        onChange={(e) => setCustomer({...customer, name: e.target.value})}
                      />
                      <Input
                        placeholder="Telefone"
                        value={customer.phone || ''}
                        onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                      />
                      {isDelivery && (
                        <Textarea
                          placeholder="Endereço para entrega"
                          value={customer.address || ''}
                          onChange={(e) => setCustomer({...customer, address: e.target.value})}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Pagamento */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="card">Cartão</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="credit">Crediário</SelectItem>
                        </SelectContent>
                      </Select>

                      {pixQrCode && (
                        <div className="text-center p-4 bg-gray-50 rounded">
                          <p className="text-sm mb-2">QR Code PIX:</p>
                          <div className="bg-white p-2 rounded border inline-block">
                            <p className="text-xs font-mono break-all">{pixQrCode}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          onClick={processSale} 
                          disabled={cart.length === 0 || isProcessingPayment}
                          className="flex-1"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          {isProcessingPayment ? 'Processando...' : 'Finalizar Venda'}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={createQuote}
                          disabled={cart.length === 0}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Orçamento
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {/* PRODUTOS */}
          {hasPermission('seller') && (
            <TabsContent value="products" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Gestão de Produtos</h2>
                  <p className="text-gray-600">Gerencie o catálogo de produtos da loja</p>
                </div>
                <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setSelectedProduct(null);
                      setNewProduct({});
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="productName">Nome *</Label>
                        <Input
                          id="productName"
                          value={newProduct.name || ''}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="productCategory">Categoria *</Label>
                        <Select 
                          value={newProduct.category || ''} 
                          onValueChange={(value) => setNewProduct({...newProduct, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ração">Ração</SelectItem>
                            <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                            <SelectItem value="Higiene">Higiene</SelectItem>
                            <SelectItem value="Acessórios">Acessórios</SelectItem>
                            <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="productPrice">Preço *</Label>
                        <Input
                          id="productPrice"
                          type="number"
                          step="0.01"
                          value={newProduct.price || ''}
                          onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="productBarcode">Código de Barras</Label>
                        <Input
                          id="productBarcode"
                          value={newProduct.barcode || ''}
                          onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="productStock">Estoque Atual</Label>
                        <Input
                          id="productStock"
                          type="number"
                          value={newProduct.stock || ''}
                          onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="productMinStock">Estoque Mínimo</Label>
                        <Input
                          id="productMinStock"
                          type="number"
                          value={newProduct.minStock || ''}
                          onChange={(e) => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="productExpiryDate">Data de Vencimento</Label>
                        <Input
                          id="productExpiryDate"
                          type="date"
                          value={newProduct.expiryDate ? new Date(newProduct.expiryDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value ? new Date(e.target.value) : undefined})}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="productActive"
                          checked={newProduct.active ?? true}
                          onCheckedChange={(checked) => setNewProduct({...newProduct, active: checked})}
                        />
                        <Label htmlFor="productActive">Produto Ativo</Label>
                      </div>
                      
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="productDescription">Descrição</Label>
                        <Textarea
                          id="productDescription"
                          value={newProduct.description || ''}
                          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSaveProduct} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setShowProductDialog(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Filtros */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar produtos..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Produtos */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Produto</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Categoria</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Preço</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Estoque</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredProductsManagement.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                {product.barcode && (
                                  <p className="text-sm text-gray-500">{product.barcode}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{product.category}</td>
                            <td className="px-4 py-3 text-sm font-medium text-green-600">
                              R$ {product.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900">{product.stock}</span>
                                {product.stock <= product.minStock && (
                                  <Badge variant="destructive" className="text-xs">
                                    Baixo
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={product.active ? "default" : "secondary"}>
                                {product.active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setNewProduct(product);
                                    setShowProductDialog(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ORÇAMENTOS */}
          {hasPermission('seller') && (
            <TabsContent value="quotes" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Orçamentos</h2>
                  <p className="text-gray-600">Gerencie os orçamentos criados</p>
                </div>
                <div className="flex gap-2">
                  <Select value={quoteFilter} onValueChange={setQuoteFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="expired">Expirados</SelectItem>
                      <SelectItem value="converted">Convertidos</SelectItem>
                      <SelectItem value="cancelled">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lista de Orçamentos */}
              <div className="grid gap-4">
                {filteredQuotes.map((quote) => (
                  <Card key={quote.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{quote.customerName}</h3>
                          <p className="text-sm text-gray-600">{quote.customerPhone}</p>
                          {quote.customerEmail && (
                            <p className="text-sm text-gray-600">{quote.customerEmail}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">R$ {quote.total.toFixed(2)}</p>
                          <Badge 
                            variant={
                              quote.status === 'active' ? 'default' :
                              quote.status === 'expired' ? 'destructive' :
                              quote.status === 'converted' ? 'default' : 'secondary'
                            }
                          >
                            {quote.status === 'active' ? 'Ativo' :
                             quote.status === 'expired' ? 'Expirado' :
                             quote.status === 'converted' ? 'Convertido' : 'Cancelado'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Subtotal</p>
                          <p className="font-medium">R$ {quote.subtotal.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Desconto</p>
                          <p className="font-medium">R$ {quote.discount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Válido até</p>
                          <p className="font-medium">{new Date(quote.validUntil).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Criado em</p>
                          <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {quote.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">Observações:</p>
                          <p className="text-sm">{quote.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Orçamento</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="font-medium">Cliente: {quote.customerName}</p>
                                  <p className="text-sm text-gray-600">{quote.customerPhone}</p>
                                  {quote.customerEmail && (
                                    <p className="text-sm text-gray-600">{quote.customerEmail}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-green-600">R$ {quote.total.toFixed(2)}</p>
                                  <p className="text-sm text-gray-600">Válido até: {new Date(quote.validUntil).toLocaleDateString()}</p>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div>
                                <h4 className="font-medium mb-2">Itens do Orçamento</h4>
                                <div className="space-y-2">
                                  {quote.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                      <div>
                                        <p className="font-medium">{item.product.name}</p>
                                        <p className="text-sm text-gray-600">
                                          {item.quantity}x R$ {item.unitPrice.toFixed(2)}
                                        </p>
                                      </div>
                                      <p className="font-medium">R$ {item.total.toFixed(2)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div className="flex justify-between items-center">
                                <div>
                                  <p>Subtotal: R$ {quote.subtotal.toFixed(2)}</p>
                                  <p>Desconto: R$ {quote.discount.toFixed(2)}</p>
                                </div>
                                <p className="text-xl font-bold">Total: R$ {quote.total.toFixed(2)}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {quote.status === 'active' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Converter em Venda
                            </Button>
                            <Button size="sm" variant="outline">
                              <Send className="w-3 h-3 mr-1" />
                              Enviar por Email
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredQuotes.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum orçamento encontrado</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* CLIENTES */}
          {hasPermission('seller') && (
            <TabsContent value="customers" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Clientes</h2>
                  <p className="text-gray-600">Gerencie a base de clientes</p>
                </div>
                <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setSelectedCustomer(null);
                      setNewCustomer({});
                    }}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Novo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Nome *</Label>
                        <Input
                          id="customerName"
                          value={newCustomer.name || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone">Telefone *</Label>
                        <Input
                          id="customerPhone"
                          value={newCustomer.phone || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={newCustomer.email || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customerBirthDate">Data de Nascimento</Label>
                        <Input
                          id="customerBirthDate"
                          type="date"
                          value={newCustomer.birthDate ? new Date(newCustomer.birthDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setNewCustomer({...newCustomer, birthDate: e.target.value ? new Date(e.target.value) : undefined})}
                        />
                      </div>
                      
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="customerAddress">Endereço</Label>
                        <Textarea
                          id="customerAddress"
                          value={newCustomer.address || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customerCity">Cidade</Label>
                        <Input
                          id="customerCity"
                          value={newCustomer.city || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customerState">Estado</Label>
                        <Input
                          id="customerState"
                          value={newCustomer.state || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customerZipCode">CEP</Label>
                        <Input
                          id="customerZipCode"
                          value={newCustomer.zipCode || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, zipCode: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="petName">Nome do Pet</Label>
                        <Input
                          id="petName"
                          value={newCustomer.petName || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, petName: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="petBreed">Raça do Pet</Label>
                        <Input
                          id="petBreed"
                          value={newCustomer.petBreed || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, petBreed: e.target.value})}
                        />
                      </div>
                      
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="customerNotes">Observações</Label>
                        <Textarea
                          id="customerNotes"
                          value={newCustomer.notes || ''}
                          onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSaveCustomer} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Busca */}
              <Card>
                <CardContent className="p-4">
                  <Input
                    placeholder="Buscar clientes por nome, email, telefone ou nome do pet..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              {/* Lista de Clientes */}
              <div className="grid gap-4">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{customer.name}</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </p>
                              {customer.email && (
                                <p className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {customer.email}
                                </p>
                              )}
                              {customer.address && (
                                <p className="flex items-center gap-1">
                                  <MapPinIcon className="w-3 h-3" />
                                  {customer.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {customer.petName && (
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                              <Star className="w-3 h-3" />
                              Pet
                            </div>
                            <p className="font-medium">{customer.petName}</p>
                            {customer.petBreed && (
                              <p className="text-sm text-gray-600">{customer.petBreed}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {customer.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600 mb-1">Observações:</p>
                          <p className="text-sm">{customer.notes}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          Cliente desde: {new Date(customer.createdAt).toLocaleDateString()}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setNewCustomer(customer);
                              setShowCustomerDialog(true);
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Contatar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredCustomers.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum cliente encontrado</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* RELATÓRIOS */}
          {hasPermission('seller') && (
            <TabsContent value="reports" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Relatórios</h2>
                  <p className="text-gray-600">Análise de vendas e performance</p>
                </div>
                <div className="flex gap-2">
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Vendas</SelectItem>
                      <SelectItem value="products">Produtos</SelectItem>
                      <SelectItem value="customers">Clientes</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={reportPeriod} onValueChange={setReportPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Semana</SelectItem>
                      <SelectItem value="month">Mês</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={generateReport}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Gerar
                  </Button>
                  
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              {reportData && (
                <div className="space-y-6">
                  {/* Métricas Principais */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Faturamento</p>
                            <p className="text-2xl font-bold text-green-600">
                              R$ {reportData.sales[reportPeriod]?.total.toFixed(2)}
                            </p>
                          </div>
                          <DollarSign className="w-8 h-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Vendas</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {reportData.sales[reportPeriod]?.count}
                            </p>
                          </div>
                          <ShoppingCart className="w-8 h-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                            <p className="text-2xl font-bold text-purple-600">
                              R$ {reportData.sales[reportPeriod]?.avgTicket.toFixed(2)}
                            </p>
                          </div>
                          <BarChart3 className="w-8 h-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Produtos Mais Vendidos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Produtos Mais Vendidos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {reportData.products.topSelling.map((product: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-600">{product.quantity} unidades vendidas</p>
                              </div>
                            </div>
                            <p className="font-bold text-green-600">R$ {product.revenue.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Alertas de Estoque */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          Alertas de Estoque
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>Produtos com estoque baixo:</span>
                            <Badge variant="destructive">{reportData.products.lowStock}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Produtos vencendo:</span>
                            <Badge className="bg-orange-100 text-orange-800">{reportData.products.expiring}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          Clientes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>Total de clientes:</span>
                            <Badge>{reportData.customers.total}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Novos clientes:</span>
                            <Badge variant="secondary">{reportData.customers.new}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Clientes recorrentes:</span>
                            <Badge className="bg-green-100 text-green-800">{reportData.customers.returning}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!reportData && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Clique em "Gerar" para visualizar os relatórios</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* CONFIGURAÇÕES */}
          {hasPermission('admin') && (
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configurações da Empresa */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Dados da Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      <Input
                        id="companyName"
                        value={systemConfig.companyName}
                        onChange={(e) => setSystemConfig({...systemConfig, companyName: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Telefone</Label>
                      <Input
                        id="companyPhone"
                        value={systemConfig.companyPhone}
                        onChange={(e) => setSystemConfig({...systemConfig, companyPhone: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyAddress">Endereço</Label>
                      <Textarea
                        id="companyAddress"
                        value={systemConfig.companyAddress}
                        onChange={(e) => setSystemConfig({...systemConfig, companyAddress: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyCnpj">CNPJ</Label>
                      <Input
                        id="companyCnpj"
                        value={systemConfig.companyCnpj || ''}
                        onChange={(e) => setSystemConfig({...systemConfig, companyCnpj: e.target.value})}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Configurações de Impressora */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Printer className="w-5 h-5" />
                      Impressora
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="printerEnabled"
                        checked={systemConfig.printerEnabled}
                        onCheckedChange={(checked) => setSystemConfig({...systemConfig, printerEnabled: checked})}
                      />
                      <Label htmlFor="printerEnabled">Impressora Habilitada</Label>
                    </div>
                    
                    {systemConfig.printerEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="printerName">Nome da Impressora</Label>
                          <Input
                            id="printerName"
                            value={systemConfig.printerName || ''}
                            onChange={(e) => setSystemConfig({...systemConfig, printerName: e.target.value})}
                            placeholder="Ex: Epson TM-T20"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="printerIp">IP da Impressora</Label>
                          <Input
                            id="printerIp"
                            value={systemConfig.printerIp || ''}
                            onChange={(e) => setSystemConfig({...systemConfig, printerIp: e.target.value})}
                            placeholder="192.168.1.100"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="printerPort">Porta</Label>
                          <Input
                            id="printerPort"
                            type="number"
                            value={systemConfig.printerPort || 9100}
                            onChange={(e) => setSystemConfig({...systemConfig, printerPort: Number(e.target.value)})}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Configurações de Pagamento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Pagamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="pixEnabled"
                        checked={systemConfig.pixEnabled}
                        onCheckedChange={(checked) => setSystemConfig({...systemConfig, pixEnabled: checked})}
                      />
                      <Label htmlFor="pixEnabled">PIX Habilitado</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mercadoPagoToken">Token Mercado Pago</Label>
                      <Input
                        id="mercadoPagoToken"
                        type="password"
                        value={systemConfig.mercadoPagoToken || ''}
                        onChange={(e) => setSystemConfig({...systemConfig, mercadoPagoToken: e.target.value})}
                        placeholder="APP_USR-..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mercadoPagoPublicKey">Chave Pública Mercado Pago</Label>
                      <Input
                        id="mercadoPagoPublicKey"
                        value={systemConfig.mercadoPagoPublicKey || ''}
                        onChange={(e) => setSystemConfig({...systemConfig, mercadoPagoPublicKey: e.target.value})}
                        placeholder="APP_USR-..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Configurações de Delivery */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Delivery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="deliveryEnabled"
                        checked={systemConfig.deliveryEnabled}
                        onCheckedChange={(checked) => setSystemConfig({...systemConfig, deliveryEnabled: checked})}
                      />
                      <Label htmlFor="deliveryEnabled">Delivery Habilitado</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="defaultDeliveryFee">Taxa Padrão de Entrega (R$)</Label>
                      <Input
                        id="defaultDeliveryFee"
                        type="number"
                        step="0.01"
                        value={systemConfig.defaultDeliveryFee}
                        onChange={(e) => setSystemConfig({...systemConfig, defaultDeliveryFee: Number(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="deliveryRadius">Raio de Entrega (km)</Label>
                      <Input
                        id="deliveryRadius"
                        type="number"
                        value={systemConfig.deliveryRadius}
                        onChange={(e) => setSystemConfig({...systemConfig, deliveryRadius: Number(e.target.value)})}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Configurações de Estoque */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Estoque
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="lowStockAlert"
                        checked={systemConfig.lowStockAlert}
                        onCheckedChange={(checked) => setSystemConfig({...systemConfig, lowStockAlert: checked})}
                      />
                      <Label htmlFor="lowStockAlert">Alerta de Estoque Baixo</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="expiryAlert"
                        checked={systemConfig.expiryAlert}
                        onCheckedChange={(checked) => setSystemConfig({...systemConfig, expiryAlert: checked})}
                      />
                      <Label htmlFor="expiryAlert">Alerta de Vencimento</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="expiryDays">Alertar X dias antes do vencimento</Label>
                      <Input
                        id="expiryDays"
                        type="number"
                        value={systemConfig.expiryDays}
                        onChange={(e) => setSystemConfig({...systemConfig, expiryDays: Number(e.target.value)})}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Configurações de Comunicação */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Comunicação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="whatsappEnabled"
                        checked={systemConfig.whatsappEnabled}
                        onCheckedChange={(checked) => setSystemConfig({...systemConfig, whatsappEnabled: checked})}
                      />
                      <Label htmlFor="whatsappEnabled">WhatsApp Habilitado</Label>
                    </div>
                    
                    {systemConfig.whatsappEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="whatsappToken">Token WhatsApp API</Label>
                        <Input
                          id="whatsappToken"
                          type="password"
                          value={systemConfig.whatsappToken || ''}
                          onChange={(e) => setSystemConfig({...systemConfig, whatsappToken: e.target.value})}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="smsEnabled"
                        checked={systemConfig.smsEnabled}
                        onCheckedChange={(checked) => setSystemConfig({...systemConfig, smsEnabled: checked})}
                      />
                      <Label htmlFor="smsEnabled">SMS Habilitado</Label>
                    </div>
                    
                    {systemConfig.smsEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="smsToken">Token SMS API</Label>
                        <Input
                          id="smsToken"
                          type="password"
                          value={systemConfig.smsToken || ''}
                          onChange={(e) => setSystemConfig({...systemConfig, smsToken: e.target.value})}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Gerenciamento de Usuários */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Usuários do Sistema
                  </CardTitle>
                  <CardDescription>
                    Gerencie os usuários que têm acesso ao sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Usuários Cadastrados</h3>
                    <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Novo Usuário
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="newUserName">Nome</Label>
                            <Input
                              id="newUserName"
                              value={newUser.name || ''}
                              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="newUserEmail">Email</Label>
                            <Input
                              id="newUserEmail"
                              type="email"
                              value={newUser.email || ''}
                              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="newUserPhone">Telefone</Label>
                            <Input
                              id="newUserPhone"
                              value={newUser.phone || ''}
                              onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="newUserRole">Função</Label>
                            <Select value={newUser.role} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="seller">Vendedor</SelectItem>
                                <SelectItem value="cashier">Caixa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="newUserPassword">Senha</Label>
                            <Input
                              id="newUserPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Button onClick={handleAddUser} className="flex-1">
                              Adicionar
                            </Button>
                            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={user.role === 'admin' ? 'default' : user.role === 'seller' ? 'secondary' : 'outline'}>
                                {getRoleName(user.role)}
                              </Badge>
                              <Badge variant={user.active ? 'default' : 'destructive'}>
                                {user.active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Dialog open={showPasswordDialog && selectedUser?.id === user.id} onOpenChange={(open) => {
                            setShowPasswordDialog(open);
                            if (!open) setSelectedUser(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Key className="w-3 h-3 mr-1" />
                                Senha
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Alterar Senha</DialogTitle>
                                <DialogDescription>
                                  Alterar senha de {user.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="changePassword">Nova Senha</Label>
                                  <Input
                                    id="changePassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                  />
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button onClick={handleChangePassword} className="flex-1">
                                    Alterar Senha
                                  </Button>
                                  <Button variant="outline" onClick={() => {
                                    setShowPasswordDialog(false);
                                    setSelectedUser(null);
                                    setNewPassword('');
                                  }}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Botão Salvar Configurações */}
              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}