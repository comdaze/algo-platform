import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'zh' | 'en';

const STORAGE_KEY = 'algo-lang';

// v1 scope: shell (top bar / side nav / breadcrumbs), page headers
// (title + description) and primary action buttons. Deeper body strings
// (table columns, form fields, statuses) and backend data stay as-is for now.
type Entry = { zh: string; en: string };

export const messages: Record<string, Entry> = {
  // Product / top bar
  'app.title': { zh: '算法运营平台', en: 'Algorithm Ops Platform' },
  'top.language': { zh: '语言', en: 'Language' },
  'top.settings': { zh: '设置', en: 'Settings' },
  'top.profile': { zh: '账户', en: 'Profile' },
  'top.theme.toLight': { zh: '白天', en: 'Light' },
  'top.theme.toDark': { zh: '黑夜', en: 'Dark' },
  'top.theme.tip': { zh: '切换主题（白天 / 黑夜）', en: 'Toggle theme (light / dark)' },

  // Breadcrumb root
  'crumb.home': { zh: '首页', en: 'Home' },

  // Side navigation
  'nav.dashboard': { zh: '仪表盘', en: 'Dashboard' },
  'nav.group.models': { zh: '模型', en: 'Models' },
  'nav.algorithms': { zh: '算法', en: 'Algorithms' },
  'nav.registry': { zh: '算法注册表', en: 'Registry' },
  'nav.coverage': { zh: '覆盖地图', en: 'Coverage Map' },
  'nav.expModels': { zh: '实验与模型', en: 'Experiments & Models' },
  'nav.experiments': { zh: '实验追踪 (MLflow)', en: 'Experiments (MLflow)' },
  'nav.models': { zh: '模型注册 (MLflow)', en: 'Models (MLflow)' },
  'nav.automl': { zh: 'AutoML 助手 (MLZero)', en: 'AutoML Assistant (MLZero)' },
  'nav.group.operations': { zh: '运营', en: 'Operations' },
  'nav.workflows': { zh: '工作流', en: 'Workflows' },
  'nav.executions': { zh: '执行记录', en: 'Executions' },
  'nav.pipelineEditor': { zh: '流水线编辑器', en: 'Pipeline Editor' },
  'nav.monitoring': { zh: '监控', en: 'Monitoring' },
  'nav.overview': { zh: '概览', en: 'Overview' },
  'nav.drift': { zh: '漂移报告', en: 'Drift Report' },
  'nav.grafana': { zh: 'Grafana 看板', en: 'Grafana Dashboards' },
  'nav.backtesting': { zh: '回测', en: 'Backtesting' },
  'nav.settings': { zh: '设置', en: 'Settings' },

  // Common buttons
  'btn.refresh': { zh: '刷新', en: 'Refresh' },
  'btn.openNewTab': { zh: '在新标签打开', en: 'Open in new tab' },
  'btn.viewAll': { zh: '查看全部', en: 'View all' },
  'btn.viewAlgorithms': { zh: '查看算法', en: 'View algorithms' },
  'btn.createAlgorithm': { zh: '创建算法', en: 'Create algorithm' },
  'btn.delete': { zh: '删除', en: 'Delete' },
  'btn.save': { zh: '保存', en: 'Save' },
  'btn.reset': { zh: '重置', en: 'Reset' },
  'btn.runPipeline': { zh: '运行流水线', en: 'Run pipeline' },
  'btn.runBacktest': { zh: '运行回测', en: 'Run backtest' },

  // Dashboard
  'page.dashboard.desc': {
    zh: '一览风/光功率预测模型表现、流水线执行与系统健康。',
    en: 'Monitor wind & solar power-forecasting model performance, pipeline executions, and system health at a glance.',
  },
  'dash.recentExecutions': { zh: '最近的流水线执行', en: 'Recent pipeline executions' },
  'dash.mapeTrend': { zh: 'MAPE 趋势（近 30 天）', en: 'MAPE Trend (Last 30 Days)' },
  'dash.mapeTrend.desc': {
    zh: '示意数据 —— 暂无后端时序指标来源。',
    en: 'Illustrative — no backend time-series metrics source yet.',
  },
  'dash.noExecutions': { zh: '暂无执行记录', en: 'No recent executions' },

  // Algorithms
  'page.algorithms.title': { zh: '算法', en: 'Algorithms' },

  // Monitoring
  'page.monitoring.title': { zh: '监控', en: 'Monitoring' },
  'page.monitoring.desc': {
    zh: '已部署风/光预测模型的准确度与数据漂移健康度。',
    en: 'Model accuracy and data-drift health across deployed wind & solar forecasting models.',
  },

  // Drift report
  'page.drift.title': { zh: '漂移报告', en: 'Drift Report' },
  'page.drift.desc': { zh: 'Evidently 数据漂移报告', en: 'Evidently data-drift report' },

  // Backtesting
  'page.backtesting.title': { zh: '回测', en: 'Backtesting' },
  'page.backtesting.desc': {
    zh: '用历史数据回放，评估模型对真实发电的预测准确度。',
    en: 'Run historical simulations to evaluate forecast accuracy against actual generation data.',
  },

  // Settings
  'page.settings.title': { zh: '设置', en: 'Settings' },
  'page.settings.desc': {
    zh: '全局大模型配置：供 AutoML 助手 (MLZero) 等使用。OpenAI 兼容端点 → Endpoint URL 映射为 proxy_url。',
    en: 'Global LLM configuration used by the AutoML assistant (MLZero) etc. OpenAI-compatible endpoint → Endpoint URL maps to proxy_url.',
  },

  // Embedded
  'page.grafana.title': { zh: '监控看板 · Grafana', en: 'Grafana Dashboards' },
  'page.grafana.desc': {
    zh: '内嵌 Grafana 监控看板（直达看板 · kiosk 模式，主题跟随平台）',
    en: 'Embedded Grafana dashboard (deep-linked · kiosk mode, theme follows the platform).',
  },
  'page.mlflow.title': { zh: '实验追踪 · MLflow', en: 'MLflow Experiments' },
  'page.mlflow.desc': {
    zh: '内嵌 MLflow 实验追踪（已隐藏 MLflow 自身顶栏，主题跟随平台明/暗）',
    en: 'Embedded MLflow experiment tracking (MLflow chrome hidden; theme follows the platform).',
  },
  'page.mlflowModels.title': { zh: '模型注册 · MLflow Models', en: 'MLflow Model Registry' },
  'page.mlflowModels.desc': {
    zh: '内嵌 MLflow 模型注册表（已隐藏 MLflow 自身顶栏，主题跟随平台明/暗）',
    en: 'Embedded MLflow model registry (MLflow chrome hidden; theme follows the platform).',
  },
};

export function getInitialLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  /** Translate a message key for the active language; falls back to the key. */
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (k) => k,
});

export const useLang = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage errors */
    }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    // Keep the browser tab title in sync with the language (no brand name).
    document.title = messages['app.title']?.[lang] ?? document.title;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === 'zh' ? 'en' : 'zh')), []);
  const t = useCallback((key: string) => messages[key]?.[lang] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
