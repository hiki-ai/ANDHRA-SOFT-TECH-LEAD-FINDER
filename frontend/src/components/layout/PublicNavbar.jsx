import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DatabaseZap, ArrowRight, Menu, X, Shield, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '@/hooks/useAuth';

export function PublicNavbar() {
  const { isAuthenticated, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (anchorId) => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/' + anchorId);
    } else {
      const el = document.querySelector(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-surface-200/80 sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* AST Extractor Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:from-brand-700 group-hover:to-indigo-700 transition-all">
            <DatabaseZap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight text-surface-900 uppercase">
              AST Extractor
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-brand-600 uppercase">
              Andhra Soft Tech
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); handleNavClick('#home'); }}
            className="text-xs font-semibold text-surface-600 hover:text-brand-600 transition-colors"
          >
            Home
          </a>
          <a
            href="#features"
            onClick={(e) => { e.preventDefault(); handleNavClick('#features'); }}
            className="text-xs font-semibold text-surface-600 hover:text-brand-600 transition-colors"
          >
            Features
          </a>
          <a
            href="#pricing"
            onClick={(e) => { e.preventDefault(); handleNavClick('#pricing'); }}
            className="text-xs font-semibold text-surface-600 hover:text-brand-600 transition-colors flex items-center gap-1.5"
          >
            <span>Pricing</span>
            <span className="px-1.5 py-0.2 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-200/80">
              3 Plans
            </span>
          </a>
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); handleNavClick('#contact'); }}
            className="text-xs font-semibold text-surface-600 hover:text-brand-600 transition-colors"
          >
            Contact
          </a>
        </nav>

        {/* Desktop Auth & CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link to={role === 'admin' ? '/dashboard' : '/app'}>
              <Button size="sm" variant="primary" iconRight={ArrowRight}>
                {role === 'admin' ? 'Admin Dashboard' : 'Open Workspace'}
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button size="sm" variant="ghost">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" variant="primary" iconRight={Sparkles}>
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-lg text-surface-600 hover:bg-surface-100 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-surface-200 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-2">
            <button
              onClick={() => handleNavClick('#home')}
              className="text-left py-2 text-xs font-semibold text-surface-700 hover:text-brand-600"
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('#features')}
              className="text-left py-2 text-xs font-semibold text-surface-700 hover:text-brand-600"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('#pricing')}
              className="text-left py-2 text-xs font-semibold text-surface-700 hover:text-brand-600"
            >
              Pricing Plans
            </button>
            <button
              onClick={() => handleNavClick('#contact')}
              className="text-left py-2 text-xs font-semibold text-surface-700 hover:text-brand-600"
            >
              Contact & Support
            </button>
          </nav>

          <div className="pt-3 border-t border-surface-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <Link to={role === 'admin' ? '/dashboard' : '/app'} onClick={() => setMobileMenuOpen(false)}>
                <Button fullWidth size="sm" variant="primary" iconRight={ArrowRight}>
                  {role === 'admin' ? 'Admin Dashboard' : 'Open Workspace'}
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button fullWidth size="sm" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button fullWidth size="sm" variant="primary" iconRight={Sparkles}>
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default PublicNavbar;
