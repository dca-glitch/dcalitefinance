import type { NavigationItem } from '../types/navigation';

export const appNavigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/app/dashboard',
    status: 'active',
    description: 'Overview of your workspace',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Clients',
    path: '/app/clients',
    status: 'active',
    description: 'Manage client records',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Projects',
    path: '/app/projects',
    status: 'active',
    description: 'Manage project records',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Service Items',
    path: '/app/service-items',
    status: 'active',
    description: 'Manage catalog items',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Vendors',
    path: '/app/vendors',
    status: 'active',
    description: 'Manage vendor records',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Expense Categories',
    path: '/app/expense-categories',
    status: 'active',
    description: 'Manage expense categories',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Bills / Expenses',
    path: '/app/bills',
    status: 'active',
    description: 'Manage bills and expense records',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Invoices',
    path: '/app/invoices',
    status: 'active',
    description: 'Create and manage invoices',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Payments',
    path: '/app/payments',
    status: 'active',
    description: 'Record and reverse payments',
    showInSidebar: true,
    showInMobileNav: true,
  },
];

export const sidebarNavigation = appNavigation.filter((item) => item.showInSidebar);

export function getCurrentNavigationItem(pathname: string): NavigationItem | null {
  return appNavigation.find((item) => item.status === 'active' && pathname.startsWith(item.path)) ?? null;
}
