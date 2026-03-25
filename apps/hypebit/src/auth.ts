export interface HypebitUser {
  email: string;
  role: 'ceo' | 'growth' | 'analyst' | 'admin';
  name: string;
  company: string;
  avatar: string;
}

const DEMO_USERS: HypebitUser[] = [
  { email: 'ceo@demo.hypebit.com',     role: 'ceo',     name: 'Alex Chen',     company: 'Demo SaaS Co', avatar: 'AC' },
  { email: 'growth@demo.hypebit.com',  role: 'growth',  name: 'Jordan Taylor', company: 'Demo SaaS Co', avatar: 'JT' },
  { email: 'analyst@demo.hypebit.com', role: 'analyst', name: 'Sam Rivera',    company: 'Demo SaaS Co', avatar: 'SR' },
  { email: 'admin@demo.hypebit.com',   role: 'admin',   name: 'Morgan Lee',    company: 'Demo SaaS Co', avatar: 'ML' },
];

export function login(email: string, password: string): HypebitUser | null {
  if (password !== 'demo123') return null;
  return DEMO_USERS.find(u => u.email === email) || null;
}

export function getDefaultView(role: HypebitUser['role']): string {
  switch (role) {
    case 'ceo':     return 'overview';
    case 'growth':  return 'growth';
    case 'analyst': return 'product';
    case 'admin':   return 'system';
  }
}

export function canAccess(role: HypebitUser['role'], view: string): boolean {
  const access: Record<string, string[]> = {
    overview:   ['ceo', 'admin'],
    growth:     ['ceo', 'growth', 'admin'],
    revenue:    ['ceo', 'admin'],
    product:    ['ceo', 'analyst', 'admin'],
    automation: ['ceo', 'growth', 'admin'],
    customers:  ['ceo', 'growth', 'analyst', 'admin'],
    system:     ['admin'],
  };
  return (access[view] || []).includes(role);
}
