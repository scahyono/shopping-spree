import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Box } from 'lucide-react';
import BudgetHeader from './BudgetHeader';

export default function Layout({ children }) {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex flex-col h-screen bg-brand-50 text-gray-800 font-sans overflow-hidden">
            {/* Persistent Header */}
            <BudgetHeader />

            {/* Main Content Area - Scrollable */}
            <main className="flex-1 overflow-y-auto pb-24 relative p-4 space-y-4">
                {children}
            </main>

            {/* Persistent Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-100 shadow-lg pb-safe">
                <div className="flex justify-around items-center h-16">
                    <Link to="/" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive('/') ? 'text-brand-600' : 'text-gray-400'}`}>
                        <ShoppingCart size={24} />
                        <span className="text-xs font-medium mt-1">Shop</span>
                    </Link>

                    <Link to="/stock" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive('/stock') ? 'text-brand-600' : 'text-gray-400'}`}>
                        <Box size={24} />
                        <span className="text-xs font-medium mt-1">Stock</span>
                    </Link>
                </div>
            </footer>
        </div>
    );
}
