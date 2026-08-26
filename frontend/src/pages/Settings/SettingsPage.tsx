import React, { useCallback, useEffect, useState } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import Button from '@cloudscape-design/components/button';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';
import Alert from '@cloudscape-design/components/alert';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import { getLlmSettings, saveLlmSettings } from '../../api/settings';

const PROVIDERS = [
  { label: 'OpenAI 兼容 (openai)', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'SageMaker', value: 'sagemaker' },
  { label: 'Bedrock', value: 'bedrock' },
];

const SettingsPage: React.FC = () => {
  const [endpointUrl, setEndpointUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getLlmSettings();
      setEndpointUrl(s.endpointUrl);
      setModelId(s.modelId);
      setProvider(s.provider || 'openai');
      setHasApiKey(s.hasApiKey);
      setApiKey('');
    } catch (e) {
      setFlash([{ type: 'error', content: e instanceof Error ? e.message : '加载设置失败', dismissible: true, onDismiss: () => setFlash([]) }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    setFlash([]);
    try {
      const res = await saveLlmSettings({
        endpointUrl,
        modelId,
        provider,
        // Only send the key if the user typed a new one; empty keeps the stored key.
        ...(apiKey ? { apiKey } : {}),
      });
      setHasApiKey(res.hasApiKey);
      setApiKey('');
      setFlash([{ type: 'success', content: 'LLM 设置已保存（API Key 加密存于 Secrets Manager，不回显）', dismissible: true, onDismiss: () => setFlash([]) }]);
    } catch (e) {
      setFlash([{ type: 'error', content: e instanceof Error ? e.message : '保存失败', dismissible: true, onDismiss: () => setFlash([]) }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="全局大模型配置：供 AutoML 助手 (MLZero) 等使用。OpenAI 兼容端点 → Endpoint URL 映射为 proxy_url。">
        设置 · Settings
      </Header>
      {flash.length > 0 && <Flashbar items={flash} />}
      <Alert type="info" header="关于 API Key">
        API Key 仅写入后端 <b>Secrets Manager</b>（<code>algo/llm/config</code>），前端与 GET 接口<b>永不回显</b>；留空保存表示沿用已存的 Key。
      </Alert>
      <Container header={<Header variant="h2">大模型 (LLM)</Header>}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={load} disabled={loading || saving}>重置</Button>
              <Button variant="primary" onClick={onSave} loading={saving} disabled={loading}>保存</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <FormField label="Provider" description="OpenAI 兼容端点选 openai（中国区推荐）">
              <Select
                selectedOption={PROVIDERS.find((p) => p.value === provider) || PROVIDERS[0]}
                options={PROVIDERS}
                onChange={({ detail }) => setProvider(detail.selectedOption.value || 'openai')}
              />
            </FormField>
            <FormField label="Endpoint URL" description="OpenAI 兼容 base_url，如 https://dashscope.aliyuncs.com/compatible-mode/v1">
              <Input value={endpointUrl} onChange={({ detail }) => setEndpointUrl(detail.value)} placeholder="https://.../v1" />
            </FormField>
            <FormField label="Model ID" description="如 qwen2.5-72b-instruct / deepseek-chat / gpt-4o">
              <Input value={modelId} onChange={({ detail }) => setModelId(detail.value)} placeholder="model id" />
            </FormField>
            <FormField
              label="API Key"
              description={hasApiKey ? '已配置（留空则不修改）' : '尚未配置'}
              secondaryControl={<Badge color={hasApiKey ? 'green' : 'grey'}>{hasApiKey ? '已配置' : '未配置'}</Badge>}
            >
              <Input
                type="password"
                value={apiKey}
                onChange={({ detail }) => setApiKey(detail.value)}
                placeholder={hasApiKey ? '••••••（留空保持不变）' : '输入 API Key'}
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </Container>
      <Box color="text-body-secondary" fontSize="body-s">
        提示：保存后，AutoML 助手运行时后端会从 Secrets Manager 取出 Key 注入 <code>OPENAI_API_KEY</code>，并用 Endpoint/Model 生成 MLZero 的 <code>custom_config.yaml</code>（proxy_url + model）。
      </Box>
    </SpaceBetween>
  );
};

export default SettingsPage;
