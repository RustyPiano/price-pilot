import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { fetchExchangeRates } from '../constants/currencies';
import { useLanguage } from '../context/LanguageContext';
import { X, Trophy, TrendingDown, ShoppingCart, Loader2 } from 'lucide-react';

export default function ProductList({ products, baseCurrency, onRemoveProduct, unitSystem }) {
    const [exchangeRates, setExchangeRates] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        const getLatestRates = async () => {
            setIsLoading(true);
            const rates = await fetchExchangeRates(baseCurrency);
            if (rates) {
                setExchangeRates(rates);
            } else {
                toast.error(t('fetchRatesFail'));
            }
            setIsLoading(false);
        };
        getLatestRates();
    }, [baseCurrency, t]);

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
        if (index === 0) return 'bg-primary text-foreground border-theme';
        if (index === sortedProducts.length - 1 && sortedProducts.length > 1) return 'bg-accent text-white border-theme';
        return 'bg-surface text-foreground border-theme';
    };

    if (isLoading) {
        return (
            <div className="text-center py-12 text-foreground font-medium flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span>{t('loadingRates')}</span>
            </div>
        );
    }

    if (sortedProducts.length === 0) {
        return (
            <div className="text-center py-12 flex flex-col items-center gap-3">
                <ShoppingCart className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
                <p className="text-foreground font-medium uppercase tracking-wide">{t('addItemsToCompare')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sortedProducts.map((product, index) => (
                <div
                    key={product.originalIndex}
                    className={`flex items-center justify-between p-4 border-theme transition-all duration-200 rounded-theme ${index === 0
                        ? 'bg-surface shadow-theme-base hover:-translate-y-1 hover:shadow-theme-lg'
                        : 'bg-surface hover:shadow-theme-base hover:-translate-y-1'
                        }`}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`flex-shrink-0 w-9 h-9 flex items-center justify-center text-sm font-bold shadow-theme-sm rounded-theme ${getBadgeColor(index)}`}>
                            #{index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-base text-foreground truncate">{product.name}</span>
                                {index === 0 && (
                                    <span className="flex-shrink-0 text-xs font-semibold bg-primary text-foreground px-2 py-0.5 border-theme uppercase shadow-theme-sm rounded-theme inline-flex items-center gap-1">
                                        <Trophy className="w-3 h-3" />
                                        {t('bestDeal')}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 font-medium font-mono">
                                {product.price} {product.currency} / {product.quantity}{t(`units.${product.unit}`) || product.unit}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <div className="text-right">
                            <div className={`font-bold text-lg ${index === 0 ? 'text-foreground' : 'text-gray-600'}`}>
                                {formatPrice(product.unitPrice)}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                                /{t(`units.${product.baseUnit}`) || product.baseUnit}
                            </div>
                        </div>

                        <button
                            onClick={() => onRemoveProduct(product.originalIndex)}
                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-theme hover:shadow-theme-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}

            {sortedProducts.length >= 2 && (
                <div className="mt-6 p-4 bg-red-50 border-theme shadow-theme-base text-center rounded-theme">
                    <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
                        <TrendingDown className="w-4 h-4 text-accent" />
                        {t('priceDifference')}
                        <span className="text-accent font-bold text-lg">
                            {((sortedProducts[sortedProducts.length - 1].unitPrice / sortedProducts[0].unitPrice - 1) * 100).toFixed(0)}%
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}