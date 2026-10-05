import React, { useState } from 'react';
import { Play, ShieldAlert } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { BUSINESS_CATEGORIES, PRIMARY_LOCATIONS } from '../../utils/constants';

export function CollectionForm({ onSubmit, onCancel, isLoading = false }) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [targetCount, setTargetCount] = useState('500');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!category.trim()) errs.category = 'Please select or enter a business category.';
    if (!location.trim()) errs.location = 'Please select or enter a target location.';
    const num = parseInt(targetCount, 10);
    if (isNaN(num) || num < 1 || num > 50000) {
      errs.targetCount = 'Target must be between 1 and 50,000 vendors.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      category,
      location,
      target_count: parseInt(targetCount, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SearchableSelect
        label="Business Category"
        placeholder="Select or enter category (e.g., Furniture, Hospitals)..."
        options={BUSINESS_CATEGORIES}
        value={category}
        onChange={(val) => {
          setCategory(val);
          if (errors.category) setErrors((prev) => ({ ...prev, category: null }));
        }}
        error={errors.category}
        helperText="Select a standard industry or enter a custom category keyword."
      />

      <SearchableSelect
        label="Location / Region"
        placeholder="Select or enter city (e.g., Rajahmundry, Visakhapatnam)..."
        options={PRIMARY_LOCATIONS}
        value={location}
        onChange={(val) => {
          setLocation(val);
          if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
        }}
        error={errors.location}
        helperText="Geographic boundary for vendor search."
      />

      <Input
        label="Target Number of Vendors"
        type="number"
        min="1"
        max="50000"
        value={targetCount}
        onChange={(e) => {
          setTargetCount(e.target.value);
          if (errors.targetCount) setErrors((prev) => ({ ...prev, targetCount: null }));
        }}
        placeholder="e.g. 5000"
        error={errors.targetCount}
        helperText="Max 50,000 per single collection batch."
      />

      <div className="p-3 bg-surface-50 rounded-xl border border-surface-200/80 flex items-start gap-2.5 text-xs text-surface-600">
        <ShieldAlert className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Data collection strictly routes through permitted connectors, respecting rate-limits and robots policies.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          iconLeft={Play}
        >
          Start Data Collection
        </Button>
      </div>
    </form>
  );
}

export default CollectionForm;
