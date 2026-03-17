export type Locale = 'zh' | 'en';

export type CurrencyCode =
  | 'CNY'
  | 'USD'
  | 'EUR'
  | 'JPY'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'HKD'
  | 'NZD'
  | 'SGD';

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  currency: CurrencyCode | string;
  timestamp: string;
}

export type ProductInput = Partial<Pick<Product, 'id' | 'timestamp'>> &
  Pick<Product, 'name' | 'price' | 'quantity' | 'unit' | 'currency'>;

export interface EnrichedProduct extends Product {
  convertedPrice: number;
  unitPrice: number;
  standardQuantity: number;
  unitType: string;
  baseUnit: string;
  originalIndex: number;
}

export interface ProductGroup {
  unitType: string;
  baseUnit: string | null;
  products: EnrichedProduct[];
}

export interface UnitConversion {
  rate: number;
  displayName: string;
}

export interface UnitCategory {
  baseUnit: string;
  displayName: string;
  conversions: Record<string, UnitConversion>;
}

export type UnitSystem = Record<string, UnitCategory>;

export interface ComparisonList {
  id: string;
  name: string;
  category: string;
  products: Product[];
  baseCurrency: CurrencyCode | string;
  unitSystem: UnitSystem;
  recentUnits: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ComparisonListDraft = Partial<
  Omit<ComparisonList, 'products' | 'unitSystem' | 'recentUnits'>
> & {
  products?: Array<Partial<Product>>;
  unitSystem?: UnitSystem;
  recentUnits?: string[];
};

export type SharedComparisonList = Omit<
  ComparisonList,
  'id' | 'archived' | 'createdAt' | 'updatedAt'
>;

export type ExchangeRates = Record<string, number>;

export interface CurrencyOption {
  code: CurrencyCode;
  name: string;
  symbol: string;
}

export interface TranslationSampleProduct {
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export type TranslationValue =
  | string
  | TranslationSampleProduct[]
  | { [key: string]: TranslationValue | undefined };

export interface TranslationDictionary {
  [key: string]: TranslationValue | undefined;
  sampleProducts: TranslationSampleProduct[];
}

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
  t: {
    (key: 'sampleProducts'): TranslationSampleProduct[];
    (key: string): string;
  };
}

export type Translate = LanguageContextValue['t'];

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  app: 'price-pilot';
  lists: ComparisonList[];
}

export type ImportStrategy = 'merge' | 'overwrite' | 'duplicate';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ImagePreview {
  fileName: string;
  url: string;
}
