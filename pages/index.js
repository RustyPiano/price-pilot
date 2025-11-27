import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Toaster, toast } from 'react-hot-toast';
import AddProductForm from '../components/AddProductForm';
import CurrencySelector from '../components/CurrencySelector';
import ProductList from '../components/ProductList';
import UnitManager from '../components/UnitManager';
import UnitConverter from '../components/UnitConverter';
import { defaultUnitSystem } from '../constants/unitSystem';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState('CNY');
  const [unitSystem, setUnitSystem] = useState(defaultUnitSystem);
  const [activePanel, setActivePanel] = useState(null); // 'unit-manager' | 'converter' | null
  const formRef = useRef(null);

  // 从 localStorage 加载数据
  useEffect(() => {
    const savedProducts = localStorage.getItem('products');
    const savedUnitSystem = localStorage.getItem('unitSystem');
    const savedCurrency = localStorage.getItem('baseCurrency');

    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedUnitSystem) setUnitSystem(JSON.parse(savedUnitSystem));
    if (savedCurrency) setBaseCurrency(savedCurrency);
  }, []);

  // 保存数据到 localStorage
  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('unitSystem', JSON.stringify(unitSystem));
    localStorage.setItem('baseCurrency', baseCurrency);
  }, [products, unitSystem, baseCurrency]);

  const handleAddProduct = (product) => {
    setProducts([...products, product]);
    toast.success('添加成功！');
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
    toast.success('单位已更新');
  };

  const handleClearAll = () => {
    if (products.length === 0) return;
    if (confirm('确定清空所有商品吗？')) {
      setProducts([]);
      toast.success('已清空');
    }
  };

  return (
    <>
      <Head>
        <title>Price Pilot - 单价对比</title>
        <meta name="description" content="快速对比商品单价" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#fff',
            color: '#000',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 0 #000',
            fontWeight: 'bold',
            borderRadius: '0'
          },
        }}
      />

      <div className="min-h-screen bg-surface-100 pb-24 font-sans">
        {/* 顶部栏 */}
        <header className="bg-primary-400 border-b-3 border-black sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white border-3 border-black flex items-center justify-center text-black font-black text-xl shadow-neo-sm">
                P
              </div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">Price Pilot</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActivePanel(activePanel === 'converter' ? null : 'converter')}
                className={`p-2 border-3 border-black transition-all duration-100 ${activePanel === 'converter'
                    ? 'bg-secondary-400 text-black shadow-none translate-x-[2px] translate-y-[2px]'
                    : 'bg-white text-black shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo'
                  }`}
                title="单位转换"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'unit-manager' ? null : 'unit-manager')}
                className={`p-2 border-3 border-black transition-all duration-100 ${activePanel === 'unit-manager'
                    ? 'bg-secondary-400 text-black shadow-none translate-x-[2px] translate-y-[2px]'
                    : 'bg-white text-black shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo'
                  }`}
                title="单位设置"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
          {/* 工具面板 */}
          {activePanel === 'unit-manager' && (
            <div className="animate-bounce-slight">
              <UnitManager unitSystem={unitSystem} onUpdateUnits={handleUpdateUnits} />
            </div>
          )}
          {activePanel === 'converter' && (
            <div className="animate-bounce-slight">
              <UnitConverter unitSystem={unitSystem} />
            </div>
          )}

          {/* 快速添加表单 */}
          <div ref={formRef} className="bg-white border-3 border-black shadow-neo p-6 relative">
            <div className="absolute -top-3 -left-3 bg-secondary-400 border-3 border-black px-3 py-1 shadow-neo-sm transform -rotate-2">
              <span className="font-black text-sm uppercase">Add Item</span>
            </div>
            <div className="flex items-center justify-end mb-6">
              <CurrencySelector
                onCurrencyChange={handleCurrencyChange}
                defaultCurrency={baseCurrency}
              />
            </div>
            <AddProductForm onAddProduct={handleAddProduct} unitSystem={unitSystem} defaultCurrency={baseCurrency} />
          </div>

          {/* 商品列表 */}
          <div className="bg-white border-3 border-black shadow-neo overflow-hidden">
            <div className="px-6 py-4 border-b-3 border-black flex items-center justify-between bg-surface-100">
              <div className="flex items-center gap-3">
                <h2 className="font-black text-xl text-black uppercase">Results</h2>
                <span className="text-sm font-bold bg-black text-white px-3 py-1 rounded-none">
                  {products.length}
                </span>
              </div>
              {products.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm font-bold text-black hover:text-accent-500 hover:underline decoration-3 underline-offset-4 transition-colors"
                >
                  CLEAR ALL
                </button>
              )}
            </div>
            <div className="p-4 sm:p-6 bg-white">
              <ProductList
                products={products}
                baseCurrency={baseCurrency}
                onRemoveProduct={handleRemoveProduct}
                unitSystem={unitSystem}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}