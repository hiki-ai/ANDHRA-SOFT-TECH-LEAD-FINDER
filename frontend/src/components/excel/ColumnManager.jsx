import React, { useState } from 'react';
import { Columns, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';

export function ColumnManager({ isOpen, onClose, onAddColumn, columns = [] }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddColumn({
      key: name.toLowerCase().replace(/\s+/g, '_'),
      label: name.trim(),
      type,
    });
    setName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Spreadsheet Columns"
      subtitle="Define custom fields stored in PostgreSQL JSONB."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Column Name"
          placeholder="e.g. Lead Owner, Turn Over, GSTIN"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Select
          label="Data Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'number', label: 'Number' },
            { value: 'phone', label: 'Phone' },
            { value: 'email', label: 'Email' },
            { value: 'date', label: 'Date' },
            { value: 'boolean', label: 'Boolean (Yes/No)' },
          ]}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" iconLeft={Plus}>
            Add Column
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ColumnManager;
