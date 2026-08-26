import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import BreadcrumbGroup, { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';
import { useTheme } from '../theme/ThemeContext';

const navItems: SideNavigationProps.Item[] = [
  { type: 'link', text: 'Dashboard', href: '/' },
  { type: 'link', text: 'Algorithms', href: '/algorithms' },
  {
    type: 'expandable-link-group',
    text: 'Workflows',
    href: '/workflows',
    items: [
      { type: 'link', text: 'Executions', href: '/workflows' },
      { type: 'link', text: 'Pipeline Editor', href: '/pipelines/editor' },
    ],
  },
  {
    type: 'expandable-link-group',
    text: 'Monitoring',
    href: '/monitoring',
    items: [
      { type: 'link', text: 'Overview', href: '/monitoring' },
      { type: 'link', text: 'Drift Report', href: '/monitoring/drift' },
      { type: 'link', text: 'Grafana 看板', href: '/monitoring/grafana' },
    ],
  },
  { type: 'link', text: 'Experiments (MLflow)', href: '/experiments' },
  { type: 'link', text: 'Models (MLflow)', href: '/models' },
  { type: 'link', text: 'Backtesting', href: '/backtesting' },
];

const breadcrumbMap: Record<string, BreadcrumbGroupProps.Item[]> = {
  '/': [{ text: 'Home', href: '/' }],
  '/algorithms': [{ text: 'Home', href: '/' }, { text: 'Algorithms', href: '/algorithms' }],
  '/workflows': [{ text: 'Home', href: '/' }, { text: 'Workflows', href: '/workflows' }],
  '/pipelines/editor': [{ text: 'Home', href: '/' }, { text: 'Workflows', href: '/workflows' }, { text: 'Pipeline Editor', href: '/pipelines/editor' }],
  '/monitoring': [{ text: 'Home', href: '/' }, { text: 'Monitoring', href: '/monitoring' }],
  '/monitoring/grafana': [{ text: 'Home', href: '/' }, { text: 'Monitoring', href: '/monitoring' }, { text: 'Grafana', href: '/monitoring/grafana' }],
  '/experiments': [{ text: 'Home', href: '/' }, { text: 'Experiments (MLflow)', href: '/experiments' }],
  '/models': [{ text: 'Home', href: '/' }, { text: 'Models (MLflow)', href: '/models' }],
  '/backtesting': [{ text: 'Home', href: '/' }, { text: 'Backtesting', href: '/backtesting' }],
};

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle } = useTheme();

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
            text: isDark ? '☀️ 白天' : '🌙 黑夜',
            title: '切换主题（白天 / 黑夜）',
            ariaLabel: 'Toggle theme',
            onClick: toggle,
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
