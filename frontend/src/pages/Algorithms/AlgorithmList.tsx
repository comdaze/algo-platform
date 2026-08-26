import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '@cloudscape-design/components/table';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import Pagination from '@cloudscape-design/components/pagination';
import TextFilter from '@cloudscape-design/components/text-filter';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Modal from '@cloudscape-design/components/modal';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import StatusBadge from '../../components/StatusBadge';
import type { Algorithm } from '../../types';
import { listAlgorithms, createAlgorithm, deleteAlgorithm } from '../../api/algorithms';
import { useLang } from '../../i18n';

const VARIETY_OPTIONS = [
  { label: 'Wind', value: 'Wind' },
  { label: 'Solar', value: 'Solar' },
];
const STATUS_OPTIONS = [
  { label: 'draft', value: 'draft' },
  { label: 'staging', value: 'staging' },
  { label: 'production', value: 'production' },
  { label: 'archived', value: 'archived' },
];

const AlgorithmList: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<Algorithm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Algorithm[]>([]);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 20;

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    province: '',
    variety: 'Wind',
    status: 'draft' as Algorithm['status'],
    mape: '',
  });

  const reload = useCallback(() => {
    setLoading(true);
    return listAlgorithms()
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((e) => setError(e?.message || 'Failed to load algorithms'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(filterText.toLowerCase()) ||
      item.province.toLowerCase().includes(filterText.toLowerCase()) ||
      item.status.toLowerCase().includes(filterText.toLowerCase())
  );
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createAlgorithm({
        name: form.name,
        province: form.province,
        variety: form.variety,
        status: form.status,
        mape: Number(form.mape) || 0,
      });
      setShowCreate(false);
      setForm({ name: '', province: '', variety: 'Wind', status: 'draft', mape: '' });
      await reload();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to create algorithm');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (selected.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(selected.map((a) => deleteAlgorithm(a.id)));
      setSelected([]);
      await reload();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to delete algorithm(s)');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SpaceBetween size="m">
      {error && (
        <Alert type="error" header="Error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Table
        loading={loading}
        loadingText="Loading algorithms..."
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        trackBy="id"
        header={
          <Header
            variant="h1"
            counter={!loading ? `(${filteredItems.length})` : undefined}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={selected.length === 0 || deleting}
                  loading={deleting}
                  onClick={handleDelete}
                >
                  {t('btn.delete')}
                </Button>
                <Button variant="primary" onClick={() => setShowCreate(true)}>
                  {t('btn.createAlgorithm')}
                </Button>
              </SpaceBetween>
            }
          >
            {t('page.algorithms.title')}
          </Header>
        }
        columnDefinitions={[
          { id: 'name', header: 'Name', cell: (item) => item.name, sortingField: 'name' },
          { id: 'province', header: 'Province', cell: (item) => item.province },
          { id: 'variety', header: '品种', cell: (item) => item.variety },
          { id: 'status', header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
          { id: 'mape', header: 'MAPE (%)', cell: (item) => `${item.mape}%` },
          { id: 'updatedAt', header: 'Last Updated', cell: (item) => item.updatedAt },
        ]}
        items={paginatedItems}
        filter={
          <TextFilter
            filteringPlaceholder="Search algorithms..."
            filteringText={filterText}
            onChange={({ detail }) => setFilterText(detail.filteringText)}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.max(1, Math.ceil(filteredItems.length / pageSize))}
            onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
          />
        }
        onRowClick={({ detail }) => navigate(`/algorithms/${detail.item.id}`)}
        empty={
          <Box textAlign="center" padding="m">
            <b>No algorithms</b>
          </Box>
        }
      />

      <Modal
        visible={showCreate}
        onDismiss={() => setShowCreate(false)}
        header="Create Algorithm"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={creating}
                disabled={!form.name || !form.province}
                onClick={handleCreate}
              >
                Create
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Name">
            <Input value={form.name} onChange={({ detail }) => setForm((f) => ({ ...f, name: detail.value }))} />
          </FormField>
          <FormField label="Province">
            <Input value={form.province} onChange={({ detail }) => setForm((f) => ({ ...f, province: detail.value }))} />
          </FormField>
          <FormField label="Variety (品种)">
            <Select
              selectedOption={VARIETY_OPTIONS.find((o) => o.value === form.variety) || VARIETY_OPTIONS[0]}
              options={VARIETY_OPTIONS}
              onChange={({ detail }) => setForm((f) => ({ ...f, variety: detail.selectedOption.value || 'Wind' }))}
            />
          </FormField>
          <FormField label="Status">
            <Select
              selectedOption={STATUS_OPTIONS.find((o) => o.value === form.status) || STATUS_OPTIONS[0]}
              options={STATUS_OPTIONS}
              onChange={({ detail }) =>
                setForm((f) => ({ ...f, status: (detail.selectedOption.value as Algorithm['status']) || 'draft' }))
              }
            />
          </FormField>
          <FormField label="MAPE (%)">
            <Input
              type="number"
              value={form.mape}
              onChange={({ detail }) => setForm((f) => ({ ...f, mape: detail.value }))}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
};

export default AlgorithmList;
