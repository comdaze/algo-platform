import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import BreadcrumbGroup, { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';

const navItems: SideNavigationProps.Item[] = [
  { type: 'link', text: 'Dashboard', href: '/' },
  { type: 'link', text: 'Algorithms', href: '/algorithms' },
  { type: 'link', text: 'Versions', href: '/versions' },
  { type: 'link', text: 'Workflows', href: '/workflows' },
  { type: 'link', text: 'Monitoring', href: '/monitoring' },
  { type: 'link', text: 'Backtesting', href: '/backtesting' },
];

const breadcrumbMap: Record<string, BreadcrumbGroupProps.Item[]> = {
  '/': [{ text: 'Home', href: '/' }],
  '/algorithms': [{ text: 'Home', href: '/' }, { text: 'Algorithms', href: '/algorithms' }],
  '/versions': [{ text: 'Home', href: '/' }, { text: 'Versions', href: '/versions' }],
  '/workflows': [{ text: 'Home', href: '/' }, { text: 'Workflows', href: '/workflows' }],
  '/monitoring': [{ text: 'Home', href: '/' }, { text: 'Monitoring', href: '/monitoring' }],
  '/backtesting': [{ text: 'Home', href: '/' }, { text: 'Backtesting', href: '/backtesting' }],
};

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumbs = breadcrumbMap[location.pathname] || [
    { text: 'Home', href: '/' },
    { text: 'Page', href: location.pathname },
  ];

  return (
    <>
      <TopNavigation
        identity={{
          href: '/',
          title: '金风天润算法平台',
        }}
        utilities={[
          {
            type: 'button',
            iconName: 'settings',
            title: 'Settings',
            ariaLabel: 'Settings',
          },
          {
            type: 'button',
            iconName: 'user-profile',
            title: 'Profile',
            ariaLabel: 'Profile',
          },
        ]}
      />
      <AppLayout
        navigation={
          <SideNavigation
            activeHref={location.pathname}
            items={navItems}
            onFollow={(event) => {
              event.preventDefault();
              navigate(event.detail.href);
            }}
          />
        }
        breadcrumbs={
          <BreadcrumbGroup
            items={breadcrumbs}
            onFollow={(event) => {
              event.preventDefault();
              navigate(event.detail.href);
            }}
          />
        }
        content={<Outlet />}
        toolsHide={true}
      />
    </>
  );
};

export default MainLayout;
