export type NavigationItemStatus = 'active' | 'future';

export interface NavigationItem {
  label: string;
  path: string;
  status: NavigationItemStatus;
  description: string;
  showInSidebar: boolean;
  showInMobileNav: boolean;
}
