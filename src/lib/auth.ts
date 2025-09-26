import { User, AuthSession, SystemConfig } from './types';

// Usuários padrão do sistema
const defaultUsers: User[] = [
  {
    id: '1',
    name: 'Administrador',
    email: 'admin@petshow.com',
    role: 'admin',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Vendedor',
    email: 'vendedor@petshow.com',
    role: 'seller',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Caixa',
    email: 'caixa@petshow.com',
    role: 'cashier',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Configurações padrão do sistema
const defaultConfig: SystemConfig = {
  id: '1',
  companyName: 'Pet Show e Cia',
  companyPhone: '(11) 99999-9999',
  companyAddress: 'Rua das Flores, 123 - Centro',
  companyCnpj: '',
  
  printerEnabled: false,
  printerName: '',
  printerIp: '',
  printerPort: 9100,
  
  mercadoPagoToken: '',
  mercadoPagoPublicKey: '',
  pixEnabled: false,
  
  deliveryEnabled: true,
  defaultDeliveryFee: 5.00,
  deliveryRadius: 10,
  
  lowStockAlert: true,
  expiryAlert: true,
  expiryDays: 30,
  
  whatsappEnabled: false,
  whatsappToken: '',
  smsEnabled: false,
  smsToken: '',
  
  updatedAt: new Date(),
  updatedBy: 'system'
};

// Senhas padrão (em produção, usar hash)
const defaultPasswords: Record<string, string> = {
  'admin@petshow.com': 'admin123',
  'vendedor@petshow.com': 'vendedor123',
  'caixa@petshow.com': 'caixa123'
};

// Armazenamento local
const STORAGE_KEYS = {
  USERS: 'petshop_users',
  SESSION: 'petshop_session',
  CONFIG: 'petshop_config',
  PASSWORDS: 'petshop_passwords'
};

// Inicializar dados padrão
export function initializeAuth() {
  if (typeof window === 'undefined') return;
  
  // Inicializar usuários se não existirem
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }
  
  // Inicializar senhas se não existirem
  if (!localStorage.getItem(STORAGE_KEYS.PASSWORDS)) {
    localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(defaultPasswords));
  }
  
  // Inicializar configurações se não existirem
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
  }
}

// Obter usuários
export function getUsers(): User[] {
  if (typeof window === 'undefined') return defaultUsers;
  
  const stored = localStorage.getItem(STORAGE_KEYS.USERS);
  return stored ? JSON.parse(stored) : defaultUsers;
}

// Salvar usuários
export function saveUsers(users: User[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// Obter configurações
export function getSystemConfig(): SystemConfig {
  if (typeof window === 'undefined') return defaultConfig;
  
  const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
  return stored ? JSON.parse(stored) : defaultConfig;
}

// Salvar configurações
export function saveSystemConfig(config: SystemConfig) {
  if (typeof window === 'undefined') return;
  config.updatedAt = new Date();
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

// Login
export function login(email: string, password: string): AuthSession | null {
  if (typeof window === 'undefined') return null;
  
  const users = getUsers();
  const passwords = JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORDS) || '{}');
  
  const user = users.find(u => u.email === email && u.active);
  
  if (!user || passwords[email] !== password) {
    return null;
  }
  
  // Atualizar último login
  user.lastLogin = new Date();
  const updatedUsers = users.map(u => u.id === user.id ? user : u);
  saveUsers(updatedUsers);
  
  // Criar sessão
  const session: AuthSession = {
    user,
    token: generateToken(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 horas
  };
  
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  return session;
}

// Logout
export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// Obter sessão atual
export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!stored) return null;
  
  const session: AuthSession = JSON.parse(stored);
  
  // Verificar se a sessão expirou
  if (new Date() > new Date(session.expiresAt)) {
    logout();
    return null;
  }
  
  return session;
}

// Verificar se usuário está logado
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}

// Verificar permissões
export function hasPermission(requiredRole: User['role']): boolean {
  const session = getCurrentSession();
  if (!session) return false;
  
  const roleHierarchy = {
    'admin': 3,
    'seller': 2,
    'cashier': 1
  };
  
  return roleHierarchy[session.user.role] >= roleHierarchy[requiredRole];
}

// Adicionar usuário (apenas admin)
export function addUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, password: string): boolean {
  if (!hasPermission('admin')) return false;
  
  const users = getUsers();
  const passwords = JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORDS) || '{}');
  
  // Verificar se email já existe
  if (users.some(u => u.email === userData.email)) {
    return false;
  }
  
  const newUser: User = {
    ...userData,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  users.push(newUser);
  passwords[userData.email] = password;
  
  saveUsers(users);
  localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));
  
  return true;
}

// Atualizar usuário
export function updateUser(userId: string, userData: Partial<User>): boolean {
  if (!hasPermission('admin')) return false;
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) return false;
  
  users[userIndex] = {
    ...users[userIndex],
    ...userData,
    updatedAt: new Date()
  };
  
  saveUsers(users);
  return true;
}

// Alterar senha
export function changePassword(userId: string, newPassword: string): boolean {
  const session = getCurrentSession();
  if (!session) return false;
  
  // Usuário pode alterar própria senha, admin pode alterar qualquer senha
  if (session.user.id !== userId && !hasPermission('admin')) {
    return false;
  }
  
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return false;
  
  const passwords = JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORDS) || '{}');
  passwords[user.email] = newPassword;
  
  localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));
  return true;
}

// Gerar token simples
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Obter nome do papel
export function getRoleName(role: User['role']): string {
  const roleNames = {
    'admin': 'Administrador',
    'seller': 'Vendedor',
    'cashier': 'Caixa'
  };
  return roleNames[role];
}

// Obter permissões do papel
export function getRolePermissions(role: User['role']): string[] {
  const permissions = {
    'admin': [
      'Gerenciar usuários',
      'Configurar sistema',
      'Ver todos os relatórios',
      'Gerenciar produtos',
      'Realizar vendas',
      'Criar orçamentos',
      'Gerenciar entregas',
      'Gerenciar clientes'
    ],
    'seller': [
      'Gerenciar produtos',
      'Realizar vendas',
      'Criar orçamentos',
      'Gerenciar entregas',
      'Gerenciar clientes',
      'Ver relatórios básicos'
    ],
    'cashier': [
      'Realizar vendas',
      'Ver produtos',
      'Ver relatórios básicos'
    ]
  };
  
  return permissions[role] || [];
}