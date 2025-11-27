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
        if (index === 0) return 'bg-green-500 text-white';
        if (index === sortedProducts.length - 1 && sortedProducts.length > 1) return 'bg-red-100 text-red-600';
        return 'bg-gray-100 text-gray-600';
    };

    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm">
                加载中...
            </div>
        );
    }

    if (sortedProducts.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-300 text-4xl mb-2">📦</div>
                <p className="text-gray-400 text-sm">添加商品开始对比</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {sortedProducts.map((product, index) => (
                <div
                    key={product.originalIndex}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* 排名徽章 */}
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${getBadgeColor(index)}`}>
                            {index + 1}
                        </span>
                        
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800 truncate">{product.name}</span>
                                {index === 0 && (
                                    <span className="flex-shrink-0 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">
                                        最划算
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                                {product.price} {product.currency} / {product.quantity}{product.unit}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* 单价 */}
                        <div className="text-right">
                            <div className={`font-bold ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                                {formatPrice(product.unitPrice)}
                            </div>
                            <div className="text-xs text-gray-400">
                                /{product.baseUnit}
                            </div>
                        </div>

                        {/* 删除按钮 */}
                        <button
                            onClick={() => onRemoveProduct(product.originalIndex)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}

            {/* 价格差异提示 */}
            {sortedProducts.length >= 2 && (
                <div className="text-center text-xs text-gray-400 pt-2">
                    最高比最低贵 {((sortedProducts[sortedProducts.length - 1].unitPrice / sortedProducts[0].unitPrice - 1) * 100).toFixed(0)}%
                </div>
            )}
        </div>
    );
}