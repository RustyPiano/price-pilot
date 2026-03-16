import { useTheme } from '../context/ThemeContext';
import { Sun, Square } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const label = `Switch to ${theme === 'neo' ? 'Modern' : 'Neo'} Theme`;

    return (
        <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center border-theme bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base transition-all rounded-theme"
            title={label}
            aria-label={label}
        >
            {theme === 'neo' ? (
                <Sun className="w-4 h-4" />
            ) : (
                <Square className="w-4 h-4" />
            )}
        </button>
    );
}
