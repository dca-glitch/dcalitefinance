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
    status: 'future',
    description: 'Customer records coming soon',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Projects',
    path: '/app/projects',
    status: 'future',
    description: 'Project tracking coming soon',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Service Items',
    path: '/app/service-items',
    status: 'future',
    description: 'Catalog tools coming soon',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Invoices',
    path: '/app/invoices',
    status: 'future',
    description: 'Billing flows coming soon',
    showInSidebar: true,
    showInMobileNav: true,
  },
  {
    label: 'Payments',
    path: '/app/payments',
    status: 'future',
    description: 'Payment tracking coming soon',
    showInSidebar: true,
    showInMobileNav: true,
  },
];

export const sidebarNavigation = appNavigation.filter((item) => item.showInSidebar);

export function getCurrentNavigationItem(pathname: string): NavigationItem | null {
  return appNavigation.find((item) => item.status === 'active' && pathname.startsWith(item.path)) ?? null;
}
