import React, { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import BreadcrumbGroup, { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';
import { useTheme } from '../theme/ThemeContext';
import { useLang } from '../i18n';

// SageMaker Studio-like shell. The product name lives ONLY in the top bar
// (TopNavigation identity) — the SideNavigation no longer repeats it as a
// header. Destinations are grouped into expandable sections; every href maps
// to an existing react-router route (visual regrouping + i18n only).
type T = (key: string) => string;

function buildNavItems(t: T): SideNavigationProps.Item[] {
  return [
    { type: 'link', text: t('nav.dashboard'), href: '/' },
    {
      type: 'section-group',
      title: t('nav.group.models'),
      items: [
        {
          type: 'section',
          text: t('nav.algorithms'),
          defaultExpanded: true,
          items: [
            { type: 'link', text: t('nav.registry'), href: '/algorithms' },
            { type: 'link', text: t('nav.coverage'), href: '/algorithms/coverage' },
          ],
        },
        {
          type: 'section',
          text: t('nav.expModels'),
          defaultExpanded: true,
          items: [
            { type: 'link', text: t('nav.experiments'), href: '/experiments' },
            { type: 'link', text: t('nav.models'), href: '/models' },
          ],
        },
        { type: 'link', text: t('nav.automl'), href: '/automl' },
      ],
    },
    {
      type: 'section-group',
      title: t('nav.group.operations'),
      items: [
        {
          type: 'section',
          text: t('nav.workflows'),
          defaultExpanded: true,
          items: [
            { type: 'link', text: t('nav.executions'), href: '/workflows' },
            { type: 'link', text: t('nav.pipelineEditor'), href: '/pipelines/editor' },
          ],
        },
        {
          type: 'section',
          text: t('nav.monitoring'),
          defaultExpanded: true,
          items: [
            { type: 'link', text: t('nav.overview'), href: '/monitoring' },
            { type: 'link', text: t('nav.drift'), href: '/monitoring/drift' },
            { type: 'link', text: t('nav.grafana'), href: '/monitoring/grafana' },
          ],
        },
        { type: 'link', text: t('nav.backtesting'), href: '/backtesting' },
      ],
    },
    { type: 'divider' },
    { type: 'link', text: t('nav.settings'), href: '/settings' },
  ];
}

function buildBreadcrumbs(t: T): Record<string, BreadcrumbGroupProps.Item[]> {
  const home = { text: t('crumb.home'), href: '/' };
  return {
    '/': [home],
    '/algorithms': [home, { text: t('nav.algorithms'), href: '/algorithms' }],
    '/algorithms/coverage': [home, { text: t('nav.algorithms'), href: '/algorithms' }, { text: t('nav.coverage'), href: '/algorithms/coverage' }],
    '/workflows': [home, { text: t('nav.workflows'), href: '/workflows' }],
    '/pipelines/editor': [home, { text: t('nav.workflows'), href: '/workflows' }, { text: t('nav.pipelineEditor'), href: '/pipelines/editor' }],
    '/monitoring': [home, { text: t('nav.monitoring'), href: '/monitoring' }],
    '/monitoring/drift': [home, { text: t('nav.monitoring'), href: '/monitoring' }, { text: t('nav.drift'), href: '/monitoring/drift' }],
    '/monitoring/grafana': [home, { text: t('nav.monitoring'), href: '/monitoring' }, { text: t('nav.grafana'), href: '/monitoring/grafana' }],
    '/experiments': [home, { text: t('nav.experiments'), href: '/experiments' }],
    '/models': [home, { text: t('nav.models'), href: '/models' }],
    '/automl': [home, { text: t('nav.automl'), href: '/automl' }],
    '/backtesting': [home, { text: t('nav.backtesting'), href: '/backtesting' }],
    '/settings': [home, { text: t('nav.settings'), href: '/settings' }],
  };
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle } = useTheme();
  const { lang, setLang, t } = useLang();

  const navItems = useMemo(() => buildNavItems(t), [t]);
  const breadcrumbMap = useMemo(() => buildBreadcrumbs(t), [t]);

  const breadcrumbs = breadcrumbMap[location.pathname] || [
    { text: t('crumb.home'), href: '/' },
    { text: location.pathname, href: location.pathname },
  ];

  return (
    <>
      <TopNavigation
        identity={{
          href: '/',
          title: t('app.title'),
        }}
        utilities={[
          {
            type: 'menu-dropdown',
            text: lang === 'zh' ? '中文' : 'English',
            title: t('top.language'),
            ariaLabel: t('top.language'),
            items: [
              { id: 'zh', text: '中文' },
              { id: 'en', text: 'English' },
            ],
            onItemClick: ({ detail }) => setLang(detail.id === 'en' ? 'en' : 'zh'),
          },
          {
            type: 'button',
            text: isDark ? `☀️ ${t('top.theme.toLight')}` : `🌙 ${t('top.theme.toDark')}`,
            title: t('top.theme.tip'),
            ariaLabel: 'Toggle theme',
            onClick: toggle,
          },
          {
            type: 'button',
            iconName: 'settings',
            title: t('top.settings'),
            ariaLabel: t('top.settings'),
            onClick: () => navigate('/settings'),
          },
          {
            type: 'button',
            iconName: 'user-profile',
            title: t('top.profile'),
            ariaLabel: t('top.profile'),
          },
        ]}
      />
      <AppLayout
        headerVariant="high-contrast"
        navigation={
          <SideNavigation
            activeHref={location.pathname}
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
