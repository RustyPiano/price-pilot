import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { fetchExchangeRates } from '../constants/currencies';

export default function ProductList({ products, baseCurrency, onRemoveProduct, unitSystem }) {
    const [exchangeRates, setExchangeRates] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 获取汇率
    useEffect(() => {
        const getLatestRates = async () => {
            setIsLoading(true);
            const rates = await fetchExchangeRates(baseCurrency);
            if (rates) {
                setExchangeRates(rates);
            } else {
                toast.error('获取汇率失败');
            }
            setIsLoading(false);
        };
        getLatestRates();
    }, [baseCurrency]);

    // 转换并排序商品
    const sortedProducts = useMemo(() => {
        if (!exchangeRates || products.length === 0) return [];

        return products.map((product, originalIndex) => {
            const productRate = exchangeRates[product.currency] || 1;
            const baseRate = exchangeRates[baseCurrency] || 1;
            const convertedPrice = product.price * (baseRate / productRate);

            let unitType = 'piece';
            let conversionRate = 1;
            let baseUnit = 'piece';

            for (const [type, info] of Object.entries(unitSystem)) {
                if (info.conversions[product.unit]) {
                    unitType = type;
                    conversionRate = info.conversions[product.unit].rate;
                    baseUnit = info.baseUnit;
                    break;
                }
            }

            const standardQuantity = product.quantity * conversionRate;
            const unitPrice = convertedPrice / standardQuantity;

            return { ...product, convertedPrice, unitPrice, standardQuantity, unitType, baseUnit, originalIndex };
        }).sort((a, b) => a.unitPrice - b.unitPrice);
    }, [products, exchangeRates, baseCurrency, unitSystem]);

    const formatPrice = (price) => new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);

    const getBadgeColor = (index) => {
        if (index === 0) return 'bg-primary-400 text-black border-3 border-black';
        if (index === sortedProducts.length - 1 && sortedProducts.length > 1) return 'bg-accent-500 text-white border-3 border-black';
        return 'bg-white text-black border-3 border-black';
    };

    if (isLoading) {
        return (
            <div className="text-center py-12 text-black font-bold animate-pulse">
                LOADING RATES...
            </div>
        );
    }

    if (sortedProducts.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4 grayscale opacity-50">🛒</div>
                <p className="text-black font-bold uppercase tracking-wide">Add items to compare</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sortedProducts.map((product, index) => (
                <div
                    key={product.originalIndex}
                    className={`flex items-center justify-between p-4 border-3 border-black transition-all duration-200 ${index === 0
                            ? 'bg-secondary-100 shadow-neo hover:-translate-y-1 hover:shadow-neo-lg'
                            : 'bg-white hover:shadow-neo hover:-translate-y-1'
                        }`}
                >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* 排名徽章 */}
                        <span className={`flex-shrink-0 w-10 h-10 flex items-center justify-center text-lg font-black shadow-neo-sm ${getBadgeColor(index)}`}>
                            #{index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-black truncate uppercase">{product.name}</span>
                                {index === 0 && (
                                    <span className="flex-shrink-0 text-xs font-black bg-primary-400 text-black px-2 py-1 border-2 border-black uppercase shadow-neo-sm">
                                        Best Deal
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 font-bold font-mono">
                                {product.price} {product.currency} / {product.quantity}{product.unit}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                        {/* 单价 */}
                        <div className="text-right">
                            <div className={`font-black text-xl ${index === 0 ? 'text-black' : 'text-gray-800'}`}>
                                {formatPrice(product.unitPrice)}
                            </div>
                            <div className="text-xs text-gray-500 font-bold uppercase">
                                /{product.baseUnit}
                            </div>
                        </div>

                        {/* 删除按钮 */}
                        <button
                            onClick={() => onRemoveProduct(product.originalIndex)}
                            className="p-2 border-3 border-black bg-white hover:bg-accent-500 hover:text-white transition-colors shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}

            {/* 价格差异提示 */}
            {sortedProducts.length >= 2 && (
                <div className="mt-6 p-4 bg-white border-3 border-black shadow-neo text-center">
                    <p className="text-sm font-bold text-black uppercase">
                        Price Difference: <span className="text-accent-500 font-black text-lg ml-1">{((sortedProducts[sortedProducts.length - 1].unitPrice / sortedProducts[0].unitPrice - 1) * 100).toFixed(0)}%</span>
                    </p>
                </div>
            )}
        </div>
    );
}