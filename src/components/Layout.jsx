import { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Box } from 'lucide-react';
import BudgetHeader from './BudgetHeader';

export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const touchStartRef = useRef(null);

    const isActive = (path) => location.pathname === path;

    const startSwipe = (point, source) => {
        touchStartRef.current = { ...point, source };
    };

    const finishSwipe = (point, source) => {
        if (!touchStartRef.current || touchStartRef.current.source !== source) return;

        const dx = point.x - touchStartRef.current.x;
        const dy = point.y - touchStartRef.current.y;

        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0 && !isActive('/stock')) {
                navigate('/stock');
            } else if (dx > 0 && !isActive('/')) {
                navigate('/');
            }
        }

        touchStartRef.current = null;
    };

    const handlePointerDown = (e) => {
        if (e.pointerType !== 'touch' || touchStartRef.current?.source === 'touch') return;
        startSwipe({ x: e.clientX, y: e.clientY }, 'pointer');
    };

    const handlePointerUp = (e) => {
        if (e.pointerType !== 'touch') return;
        finishSwipe({ x: e.clientX, y: e.clientY }, 'pointer');
    };

    const handleTouchStart = (e) => {
        if (!e.touches?.length) return;
        startSwipe({ x: e.touches[0].clientX, y: e.touches[0].clientY }, 'touch');
    };

    const handleTouchEnd = (e) => {
        if (!e.changedTouches?.length) return;
        finishSwipe({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }, 'touch');
    };

    return (
        <div className="flex flex-col h-screen bg-brand-50 text-gray-800 font-sans overflow-hidden">
            {/* Persistent Header */}
            <BudgetHeader />

            {/* Main Content Area - Scrollable */}
            <main
                className="flex-1 overflow-y-auto pb-24 relative p-4 space-y-4"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
                aria-label="Swipe left or right on empty space to switch between tabs"
            >
                <p className="sr-only">
                    Swipe left or right on empty space to switch between Shop and Stock. Swipe item cards to reveal hide or
                    buy actions.
                </p>
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
