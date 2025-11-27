import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Toaster, toast } from 'react-hot-toast';
import AddProductForm from '../components/AddProductForm';
import CurrencySelector from '../components/CurrencySelector';
import ProductList from '../components/ProductList';
import UnitManager from '../components/UnitManager';
import UnitConverter from '../components/UnitConverter';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { defaultUnitSystem } from '../constants/unitSystem';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeftRight, Settings, BarChart3, Plus, Trash2 } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState('CNY');
  const [unitSystem, setUnitSystem] = useState(defaultUnitSystem);
  const [activePanel, setActivePanel] = useState(null);
  const formRef = useRef(null);
  const { theme } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    const savedProducts = localStorage.getItem('products');
    const savedUnitSystem = localStorage.getItem('unitSystem');
    const savedCurrency = localStorage.getItem('baseCurrency');

    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedUnitSystem) setUnitSystem(JSON.parse(savedUnitSystem));
    if (savedCurrency) setBaseCurrency(savedCurrency);
  }, []);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('unitSystem', JSON.stringify(unitSystem));
    localStorage.setItem('baseCurrency', baseCurrency);
  }, [products, unitSystem, baseCurrency]);

  const handleAddProduct = (product) => {
    setProducts([...products, product]);
    toast.success(t('addedSuccess'));
  };

  const handleRemoveProduct = (index) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleCurrencyChange = (currency) => {
    setBaseCurrency(currency);
  };

  const handleUpdateUnits = (updatedSystem) => {
    setUnitSystem(updatedSystem);
    localStorage.setItem('unitSystem', JSON.stringify(updatedSystem));
    toast.success(t('unitsUpdated'));
  };

  const handleClearAll = () => {
    if (products.length === 0) return;
    if (confirm(t('confirmClear'))) {
      setProducts([]);
      toast.success(t('clearedSuccess'));
    }
  };

  return (
    <>
      <Head>
        <title>{t('appTitle')}</title>
        <meta name="description" content={t('metaDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--fg-primary)',
            border: 'var(--border-width) solid var(--border-color)',
            boxShadow: 'var(--shadow-base)',
            fontWeight: '500',
            borderRadius: 'var(--border-radius)'
          },
        }}
      />

      <div className="min-h-screen bg-surface-100 pb-24 font-sans transition-colors duration-300">
        <header className="bg-primary border-b-theme sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-surface border-theme flex items-center justify-center text-foreground font-bold text-lg shadow-theme-sm rounded-theme">
                P
              </div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">{t('appTitle')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <button
                onClick={() => setActivePanel(activePanel === 'converter' ? null : 'converter')}
                className={`w-9 h-9 flex items-center justify-center border-theme transition-all duration-100 rounded-theme ${activePanel === 'converter'
                  ? 'bg-secondary text-foreground shadow-none translate-x-[2px] translate-y-[2px]'
                  : 'bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base'
                  }`}
                title={t('unitConverter')}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'unit-manager' ? null : 'unit-manager')}
                className={`w-9 h-9 flex items-center justify-center border-theme transition-all duration-100 rounded-theme ${activePanel === 'unit-manager'
                  ? 'bg-secondary text-foreground shadow-none translate-x-[2px] translate-y-[2px]'
                  : 'bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base'
                  }`}
                title={t('unitManager')}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {activePanel === 'unit-manager' && (
            <div className="animate-fade-in">
              <UnitManager unitSystem={unitSystem} onUpdateUnits={handleUpdateUnits} />
            </div>
          )}
          {activePanel === 'converter' && (
            <div className="animate-fade-in">
              <UnitConverter unitSystem={unitSystem} />
            </div>
          )}

          <div ref={formRef} className="theme-card p-5 relative">
            <div className="absolute -top-3 -left-2 bg-secondary border-theme px-3 py-1 shadow-theme-sm transform -rotate-2 rounded-theme flex items-center gap-1">
              <Plus className="w-3 h-3" />
              <span className="font-semibold text-xs text-foreground">{t('addItem')}</span>
            </div>
            <div className="flex items-center justify-end mb-5">
              <CurrencySelector
                onCurrencyChange={handleCurrencyChange}
                defaultCurrency={baseCurrency}
              />
            </div>
            <AddProductForm onAddProduct={handleAddProduct} unitSystem={unitSystem} defaultCurrency={baseCurrency} />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t('results')}
              </h2>
              {products.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('clearAll')}
                </button>
              )}
            </div>

            <ProductList
              products={products}
              baseCurrency={baseCurrency}
              onRemoveProduct={handleRemoveProduct}
              unitSystem={unitSystem}
            />
          </div>
        </main>
      </div>
    </>
  );
}