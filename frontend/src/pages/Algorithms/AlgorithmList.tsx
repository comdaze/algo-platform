import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '@cloudscape-design/components/table';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import Pagination from '@cloudscape-design/components/pagination';
import TextFilter from '@cloudscape-design/components/text-filter';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusBadge from '../../components/StatusBadge';
import type { Algorithm } from '../../types';

// Mock data
const mockAlgorithms: Algorithm[] = [
  { id: '1', name: 'Wind Power Forecast - Heilongjiang', province: 'Heilongjiang', variety: 'Wind', status: 'production', mape: 4.2, createdAt: '2024-01-01', updatedAt: '2024-01-15' },
  { id: '2', name: 'Wind Power Forecast - Xinjiang', province: 'Xinjiang', variety: 'Wind', status: 'staging', mape: 5.8, createdAt: '2024-01-02', updatedAt: '2024-01-14' },
  { id: '3', name: 'Solar Forecast - Inner Mongolia', province: 'Inner Mongolia', variety: 'Solar', status: 'production', mape: 3.9, createdAt: '2024-01-03', updatedAt: '2024-01-13' },
  { id: '4', name: 'Wind Power Forecast - Ningxia', province: 'Ningxia', variety: 'Wind', status: 'draft', mape: 7.1, createdAt: '2024-01-04', updatedAt: '2024-01-12' },
  { id: '5', name: 'Solar Forecast - Gansu', province: 'Gansu', variety: 'Solar', status: 'archived', mape: 6.5, createdAt: '2024-01-05', updatedAt: '2024-01-11' },
];

const AlgorithmList: React.FC = () => {
  const navigate = useNavigate();
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filteredItems = mockAlgorithms.filter(
    (item) =>
      item.name.toLowerCase().includes(filterText.toLowerCase()) ||
      item.province.toLowerCase().includes(filterText.toLowerCase()) ||
      item.status.toLowerCase().includes(filterText.toLowerCase())
  );

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <Table
      header={
        <Header
          variant="h1"
          actions={
            <Button variant="primary">Create Algorithm</Button>
          }
        >
          Algorithms
        </Header>
      }
      columnDefinitions={[
        {
          id: 'name',
          header: 'Name',
          cell: (item) => item.name,
          sortingField: 'name',
        },
        { id: 'province', header: 'Province', cell: (item) => item.province },
        { id: 'variety', header: '品种', cell: (item) => item.variety },
        {
          id: 'status',
          header: 'Status',
          cell: (item) => <StatusBadge status={item.status} />,
        },
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
          pagesCount={Math.ceil(filteredItems.length / pageSize)}
          onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
        />
      }
      onRowClick={({ detail }) => {
        navigate(`/algorithms/${detail.item.id}`);
      }}
      empty={
        <SpaceBetween size="m">
          <b>No algorithms</b>
        </SpaceBetween>
      }
    />
  );
};

export default AlgorithmList;
