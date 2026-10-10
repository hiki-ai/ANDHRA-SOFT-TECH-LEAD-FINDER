import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { Play, Sparkles, ShieldAlert } from 'lucide-react';

const CATEGORIES = [
  'Furniture',
  'Restaurants & Cafes',
  'Hotels & Hospitality',
  'Real Estate & Builders',
  'Hospitals & Healthcare',
  'Schools & Educational Institutes',
  'Automobiles & Garages',
  'Electronics & Appliances',
  'Textile & Garments',
  'Hardware & Construction',
];

const LOCATIONS = [
  'Rajahmundry, Andhra Pradesh',
  'Visakhapatnam, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Guntur, Andhra Pradesh',
  'Kakinada, Andhra Pradesh',
  'Tirupati, Andhra Pradesh',
  'Nellore, Andhra Pradesh',
  'Kurnool, Andhra Pradesh',
  'Hyderabad, Telangana',
  'Bengaluru, Karnataka',
];

import { collectionService } from '../../services/collectionService';

export function QuickCollectionModal({ isOpen, onClose, onJobCreated }) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [targetCount, setTargetCount] = useState('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

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

  const handleStart = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await collectionService.startCollection({
        category: category.trim(),
        location: location.trim(),
        target_count: parseInt(targetCount, 10),
      });

      const newJob = res?.data || res;
      toast.success(`Collection job initiated for ${category} in ${location}.`);
      if (onJobCreated) onJobCreated(newJob);
      onClose();
    } catch (err) {
      console.error('[QuickCollectionModal] Error starting collection:', err);
      toast.error(err?.message || 'Failed to initiate collection job on backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New Lead Collection"
      subtitle="Configure category, geographic location, and target lead volume."
      maxWidth="md"
    >
      <form onSubmit={handleStart} className="space-y-4">
        {/* Category input */}
        <SearchableSelect
          label="Business Category"
          placeholder="Select or enter category (e.g., Furniture, Hospitals)..."
          options={CATEGORIES}
          value={category}
          onChange={(val) => {
            setCategory(val);
            if (errors.category) setErrors((prev) => ({ ...prev, category: null }));
          }}
          error={errors.category}
          helperText="Select a standard industry or enter a custom category keyword."
        />

        {/* Location input */}
        <SearchableSelect
          label="Location / Region"
          placeholder="Select or enter city (e.g., Rajahmundry, Visakhapatnam)..."
          options={LOCATIONS}
          value={location}
          onChange={(val) => {
            setLocation(val);
            if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
          }}
          error={errors.location}
          helperText="Geographic boundary for vendor search."
        />

        {/* Target Vendor Count */}
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

        {/* Permitted source compliance notice */}
        <div className="p-3 bg-surface-50 rounded-xl border border-surface-200/80 flex items-start gap-2.5 text-xs text-surface-600">
          <ShieldAlert className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Data collection strictly routes through permitted connectors, respecting rate-limits, exponential backoff, and robots policies.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            iconLeft={Play}
          >
            Start Data Collection
          </Button>
        </div>
      </form>
    </Modal>
  );
}
