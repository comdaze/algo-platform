import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import BreadcrumbGroup, { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';
import { useTheme } from '../theme/ThemeContext';

// SageMaker Studio-like shell: the product name anchors the top of the nav
// rail (SideNavigation header), and destinations are grouped into expandable
// sections. Every href below maps to an existing react-router route — this is
// a visual regrouping only, no routes added or removed.
const navHeader: SideNavigationProps['header'] = {
  text: '算法平台 · Algorithm Platform',
  href: '/',
};

const navItems: SideNavigationProps.Item[] = [
  { type: 'link', text: 'Dashboard', href: '/' },
  {
    type: 'section-group',
    title: 'Models',
    items: [
      {
        type: 'section',
        text: 'Algorithms',
        defaultExpanded: true,
        items: [
          { type: 'link', text: 'Registry', href: '/algorithms' },
          { type: 'link', text: 'Coverage Map', href: '/algorithms/coverage' },
        ],
      },
      {
        type: 'section',
        text: 'Experiments & Models',
        defaultExpanded: true,
        items: [
          { type: 'link', text: 'Experiments (MLflow)', href: '/experiments' },
          { type: 'link', text: 'Models (MLflow)', href: '/models' },
        ],
      },
    ],
  },
  {
    type: 'section-group',
    title: 'Operations',
    items: [
      {
        type: 'section',
        text: 'Workflows',
        defaultExpanded: true,
        items: [
          { type: 'link', text: 'Executions', href: '/workflows' },
          { type: 'link', text: 'Pipeline Editor', href: '/pipelines/editor' },
        ],
      },
      {
        type: 'section',
        text: 'Monitoring',
        defaultExpanded: true,
        items: [
          { type: 'link', text: 'Overview', href: '/monitoring' },
          { type: 'link', text: 'Drift Report', href: '/monitoring/drift' },
          { type: 'link', text: 'Grafana 看板', href: '/monitoring/grafana' },
        ],
      },
      { type: 'link', text: 'Backtesting', href: '/backtesting' },
    ],
  },
  { type: 'divider' },
  { type: 'link', text: '设置 · Settings', href: '/settings' },
];

const breadcrumbMap: Record<string, BreadcrumbGroupProps.Item[]> = {
  '/': [{ text: 'Home', href: '/' }],
  '/algorithms': [{ text: 'Home', href: '/' }, { text: 'Algorithms', href: '/algorithms' }],
  '/algorithms/coverage': [
    { text: 'Home', href: '/' },
    { text: 'Algorithms', href: '/algorithms' },
    { text: 'Coverage Map', href: '/algorithms/coverage' },
  ],
  '/workflows': [{ text: 'Home', href: '/' }, { text: 'Workflows', href: '/workflows' }],
  '/pipelines/editor': [
    { text: 'Home', href: '/' },
    { text: 'Workflows', href: '/workflows' },
    { text: 'Pipeline Editor', href: '/pipelines/editor' },
  ],
  '/monitoring': [{ text: 'Home', href: '/' }, { text: 'Monitoring', href: '/monitoring' }],
  '/monitoring/drift': [
    { text: 'Home', href: '/' },
    { text: 'Monitoring', href: '/monitoring' },
    { text: 'Drift Report', href: '/monitoring/drift' },
  ],
  '/monitoring/grafana': [
    { text: 'Home', href: '/' },
    { text: 'Monitoring', href: '/monitoring' },
    { text: 'Grafana', href: '/monitoring/grafana' },
  ],
  '/experiments': [{ text: 'Home', href: '/' }, { text: 'Experiments (MLflow)', href: '/experiments' }],
  '/models': [{ text: 'Home', href: '/' }, { text: 'Models (MLflow)', href: '/models' }],
  '/backtesting': [{ text: 'Home', href: '/' }, { text: 'Backtesting', href: '/backtesting' }],
  '/settings': [{ text: 'Home', href: '/' }, { text: '设置 · Settings', href: '/settings' }],
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
            iconName: 'settings',
            title: 'Settings',
            ariaLabel: 'Settings',
            onClick: () => navigate('/settings'),
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
        headerVariant="high-contrast"
        navigation={
          <SideNavigation
            activeHref={location.pathname}
            header={navHeader}
            items={navItems}
            onFollow={(event) => {
              if (!event.detail.external) {
                event.preventDefault();
                navigate(event.detail.href);
              }
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
