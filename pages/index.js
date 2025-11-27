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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: { background: '#333', color: '#fff', fontSize: '14px', padding: '8px 16px' },
        }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* 顶部栏 */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-800">💰 单价对比</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePanel(activePanel === 'converter' ? null : 'converter')}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  activePanel === 'converter' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="单位转换"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'unit-manager' ? null : 'unit-manager')}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  activePanel === 'unit-manager' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="单位设置"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
          {/* 工具面板 */}
          {activePanel === 'unit-manager' && (
            <div className="mb-4 animate-fadeIn">
              <UnitManager unitSystem={unitSystem} onUpdateUnits={handleUpdateUnits} />
            </div>
          )}
          {activePanel === 'converter' && (
            <div className="mb-4 animate-fadeIn">
              <UnitConverter unitSystem={unitSystem} />
            </div>
          )}

          {/* 快速添加表单 */}
          <div ref={formRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-800">添加商品</h2>
              <CurrencySelector
                onCurrencyChange={handleCurrencyChange}
                defaultCurrency={baseCurrency}
              />
            </div>
            <AddProductForm onAddProduct={handleAddProduct} unitSystem={unitSystem} defaultCurrency={baseCurrency} />
          </div>

          {/* 商品列表 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-gray-800">对比结果</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {products.length} 件
                </span>
              </div>
              {products.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  清空
                </button>
              )}
            </div>
            <div className="p-4">
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