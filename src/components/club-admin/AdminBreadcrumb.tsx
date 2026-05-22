import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AdminBreadcrumb({ items, className }: AdminBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-3 text-sm', className)}>
      {/* Portal badge */}
      <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gold/8 border border-gold/20 text-[10px] font-bold text-gold uppercase tracking-wider shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
        Admin
      </span>

      <ol className="flex items-center gap-1 flex-wrap">
        {/* Home/Portal Link */}
        <li className="flex items-center">
          <Link
            to="/club-admin"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Portal</span>
          </Link>
        </li>

        {/* Breadcrumb Items */}
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
            {item.href ? (
              <Link
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
