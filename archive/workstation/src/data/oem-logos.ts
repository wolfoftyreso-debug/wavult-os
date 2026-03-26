// OEM-logotyper — CDN URL + metadata
// Primär källa: Wikimedia Commons (officiella SVG-logotyper)
// Fallback: text-based logo via komponent

export interface OEMBrand {
  id: string;
  name: string;
  group: string; // "Volkswagen Group", "Stellantis" etc.
  logoUrl: string | null; // CDN URL till korrekt SVG/PNG
  serviceLogoUrl?: string | null; // Separat service-logo om den finns
  primaryColor: string;
  textColor: string;
  certificationLevel?: 'manufacturer' | 'authorized' | 'independent';
}

export const OEM_BRANDS: OEMBrand[] = [
  // ── Volkswagen Group ──────────────────────────────────
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    group: 'Volkswagen Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/120px-Volkswagen_logo_2019.svg.png',
    serviceLogoUrl: null, // VW Service använder samma logo
    primaryColor: '#001E50',
    textColor: '#ffffff',
  },
  {
    id: 'audi',
    name: 'Audi',
    group: 'Volkswagen Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/120px-Audi-Logo_2016.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#BB0A21',
    textColor: '#ffffff',
  },
  {
    id: 'skoda',
    name: 'ŠKODA',
    group: 'Volkswagen Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/%C5%A0koda_logo.svg/120px-%C5%A0koda_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#4BA82E',
    textColor: '#ffffff',
  },
  {
    id: 'seat',
    name: 'SEAT',
    group: 'Volkswagen Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/SEAT_logo.svg/120px-SEAT_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#000000',
    textColor: '#ffffff',
  },
  {
    id: 'cupra',
    name: 'CUPRA',
    group: 'Volkswagen Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/CUPRA_Logo.svg/120px-CUPRA_Logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#C1A76A',
    textColor: '#000000',
  },
  {
    id: 'porsche',
    name: 'Porsche',
    group: 'Volkswagen Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Porsche_logo.svg/120px-Porsche_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#D5001C',
    textColor: '#ffffff',
  },

  // ── Volvo Group ──────────────────────────────────────
  {
    id: 'volvo_cars',
    name: 'Volvo Cars',
    group: 'Volvo Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Volvo_Cars_2021.svg/120px-Volvo_Cars_2021.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#003057',
    textColor: '#ffffff',
  },
  {
    id: 'volvo_trucks',
    name: 'Volvo Trucks',
    group: 'Volvo Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Volvo_Trucks_2021_logo.svg/120px-Volvo_Trucks_2021_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#003057',
    textColor: '#ffffff',
  },

  // ── BMW Group ──────────────────────────────────────────
  {
    id: 'bmw',
    name: 'BMW',
    group: 'BMW Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/120px-BMW.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#0066CC',
    textColor: '#ffffff',
  },
  {
    id: 'mini',
    name: 'MINI',
    group: 'BMW Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/MINI_logo.svg/120px-MINI_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#000000',
    textColor: '#ffffff',
  },

  // ── Mercedes-Benz Group ────────────────────────────────
  {
    id: 'mercedes_benz',
    name: 'Mercedes-Benz',
    group: 'Mercedes-Benz Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/120px-Mercedes-Logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#00A0B0',
    textColor: '#ffffff',
  },

  // ── Stellantis ─────────────────────────────────────────
  {
    id: 'peugeot',
    name: 'Peugeot',
    group: 'Stellantis',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Peugeot_Lion_Modifi%C3%A9.svg/120px-Peugeot_Lion_Modifi%C3%A9.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#002F5F',
    textColor: '#ffffff',
  },
  {
    id: 'citroen',
    name: 'Citroën',
    group: 'Stellantis',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Citroen_2022.svg/120px-Citroen_2022.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#FF4343',
    textColor: '#ffffff',
  },
  {
    id: 'opel',
    name: 'Opel',
    group: 'Stellantis',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Opel_logo_2021.svg/120px-Opel_logo_2021.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#FF0000',
    textColor: '#ffffff',
  },
  {
    id: 'fiat',
    name: 'Fiat',
    group: 'Stellantis',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Fiat_Automobiles_2020.svg/120px-Fiat_Automobiles_2020.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#B01116',
    textColor: '#ffffff',
  },
  {
    id: 'alfa_romeo',
    name: 'Alfa Romeo',
    group: 'Stellantis',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Alfa_Romeo_2015.svg/120px-Alfa_Romeo_2015.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#A60000',
    textColor: '#ffffff',
  },
  {
    id: 'jeep',
    name: 'Jeep',
    group: 'Stellantis',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Jeep_logo.svg/120px-Jeep_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#000000',
    textColor: '#ffffff',
  },
  {
    id: 'ds',
    name: 'DS Automobiles',
    group: 'Stellantis',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/DS_Automobiles_-_Logo.svg/120px-DS_Automobiles_-_Logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#1A1919',
    textColor: '#C9A96E',
  },

  // ── Toyota Group ───────────────────────────────────────
  {
    id: 'toyota',
    name: 'Toyota',
    group: 'Toyota Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Toyota.svg/120px-Toyota.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#EB0A1E',
    textColor: '#ffffff',
  },
  {
    id: 'lexus',
    name: 'Lexus',
    group: 'Toyota Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Lexus_Division_emblem_2013.svg/120px-Lexus_Division_emblem_2013.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#1A1A1A',
    textColor: '#C9A96E',
  },

  // ── Hyundai Motor Group ────────────────────────────────
  {
    id: 'hyundai',
    name: 'Hyundai',
    group: 'Hyundai Motor Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Hyundai_Motor_Company_logo.svg/120px-Hyundai_Motor_Company_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#002C5F',
    textColor: '#ffffff',
  },
  {
    id: 'kia',
    name: 'Kia',
    group: 'Hyundai Motor Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.svg/120px-Kia-logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#05141F',
    textColor: '#ffffff',
  },

  // ── Renault Group ──────────────────────────────────────
  {
    id: 'renault',
    name: 'Renault',
    group: 'Renault Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Renault_2021_Text.svg/120px-Renault_2021_Text.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#F7B320',
    textColor: '#000000',
  },
  {
    id: 'dacia',
    name: 'Dacia',
    group: 'Renault Group',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Logo_Dacia_2021.svg/120px-Logo_Dacia_2021.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#1E3B8A',
    textColor: '#ffffff',
  },

  // ── Renault-Nissan-Mitsubishi Alliance ─────────────────
  {
    id: 'nissan',
    name: 'Nissan',
    group: 'Renault-Nissan-Mitsubishi Alliance',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nissan_2020_logo.svg/120px-Nissan_2020_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#C3002F',
    textColor: '#ffffff',
  },
  {
    id: 'mitsubishi',
    name: 'Mitsubishi',
    group: 'Renault-Nissan-Mitsubishi Alliance',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mitsubishi_logo.svg/120px-Mitsubishi_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#E60026',
    textColor: '#ffffff',
  },

  // ── Ford Motor Company ─────────────────────────────────
  {
    id: 'ford',
    name: 'Ford',
    group: 'Ford Motor Company',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_Motor_Company_Logo.svg/120px-Ford_Motor_Company_Logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#003478',
    textColor: '#ffffff',
  },

  // ── Honda ──────────────────────────────────────────────
  {
    id: 'honda',
    name: 'Honda',
    group: 'Honda',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/120px-Honda.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#CC0000',
    textColor: '#ffffff',
  },

  // ── Mazda ──────────────────────────────────────────────
  {
    id: 'mazda',
    name: 'Mazda',
    group: 'Mazda',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Mazda_logo_with_Japanese_text.svg/120px-Mazda_logo_with_Japanese_text.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#1C1C1C',
    textColor: '#CC0000',
  },

  // ── Tesla ──────────────────────────────────────────────
  {
    id: 'tesla',
    name: 'Tesla',
    group: 'Tesla',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/120px-Tesla_Motors.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#CC0000',
    textColor: '#ffffff',
  },

  // ── SAIC Motor ─────────────────────────────────────────
  {
    id: 'mg',
    name: 'MG',
    group: 'SAIC Motor',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/MG_logo.svg/120px-MG_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#B01116',
    textColor: '#ffffff',
  },

  // ── BYD Auto ───────────────────────────────────────────
  {
    id: 'byd',
    name: 'BYD',
    group: 'BYD Auto',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/BYD_Auto_Logo.svg/120px-BYD_Auto_Logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#1B2A6B',
    textColor: '#ffffff',
  },

  // ── Subaru Corporation ─────────────────────────────────
  {
    id: 'subaru',
    name: 'Subaru',
    group: 'Subaru Corporation',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Subaru_logo.svg/120px-Subaru_logo.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#013A8B',
    textColor: '#ffffff',
  },

  // ── Suzuki ─────────────────────────────────────────────
  {
    id: 'suzuki',
    name: 'Suzuki',
    group: 'Suzuki',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/120px-Suzuki_logo_2.svg.png',
    serviceLogoUrl: null,
    primaryColor: '#1A4089',
    textColor: '#ffffff',
  },

  // ── Oberoende ──────────────────────────────────────────
  {
    id: 'independent',
    name: 'Oberoende (märkesfri)',
    group: 'Independent',
    logoUrl: null,
    serviceLogoUrl: null,
    primaryColor: '#6366f1',
    textColor: '#ffffff',
  },
];

// Hjälpfunktioner
export function getOEMBrand(id: string): OEMBrand | undefined {
  return OEM_BRANDS.find(b => b.id === id);
}

export function getBrandsByGroup(group: string): OEMBrand[] {
  return OEM_BRANDS.filter(b => b.group === group);
}

export function getAllGroups(): string[] {
  return [...new Set(OEM_BRANDS.map(b => b.group))];
}

// Konvertera gammalt text-baserat certifikat-id till OEM brand id
export function certNameToBrandId(certName: string): string | undefined {
  const mapping: Record<string, string> = {
    'Volvo Cars': 'volvo_cars',
    'Volvo Trucks': 'volvo_trucks',
    'ŠKODA': 'skoda',
    'BMW': 'bmw',
    'MINI': 'mini',
    'Mercedes-Benz': 'mercedes_benz',
    'Volkswagen': 'volkswagen',
    'Audi': 'audi',
    'SEAT': 'seat',
    'Cupra': 'cupra',
    'CUPRA': 'cupra',
    'Porsche': 'porsche',
    'Peugeot': 'peugeot',
    'Citroën': 'citroen',
    'Opel': 'opel',
    'Fiat': 'fiat',
    'Alfa Romeo': 'alfa_romeo',
    'Jeep': 'jeep',
    'DS Automobiles': 'ds',
    'Toyota': 'toyota',
    'Lexus': 'lexus',
    'Honda': 'honda',
    'Nissan': 'nissan',
    'Mazda': 'mazda',
    'Subaru': 'subaru',
    'Mitsubishi': 'mitsubishi',
    'Suzuki': 'suzuki',
    'Hyundai': 'hyundai',
    'Kia': 'kia',
    'Ford': 'ford',
    'Tesla': 'tesla',
    'Renault': 'renault',
    'Dacia': 'dacia',
    'MG': 'mg',
    'BYD': 'byd',
    'Oberoende (märkesfri)': 'independent',
  };
  return mapping[certName];
}
