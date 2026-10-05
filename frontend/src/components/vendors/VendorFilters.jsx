import React from 'react';
import { Select } from '../common/Select';

export function VendorFilters({
  selectedCategory,
  onCategoryChange,
  selectedLocation,
  onLocationChange,
  selectedStatus,
  onStatusChange,
}) {
  return (
    <>
      <Select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        options={[
          { value: '', label: 'All Categories' },
          { value: 'Furniture', label: 'Furniture' },
          { value: 'Hospitals', label: 'Hospitals & Health' },
          { value: 'Restaurants', label: 'Restaurants' },
          { value: 'Real Estate', label: 'Real Estate' },
          { value: 'Hotels', label: 'Hotels' },
        ]}
      />

      <Select
        value={selectedLocation}
        onChange={(e) => onLocationChange(e.target.value)}
        options={[
          { value: '', label: 'All Cities (AP)' },
          { value: 'Rajahmundry', label: 'Rajahmundry' },
          { value: 'Visakhapatnam', label: 'Visakhapatnam' },
          { value: 'Vijayawada', label: 'Vijayawada' },
          { value: 'Guntur', label: 'Guntur' },
          { value: 'Kakinada', label: 'Kakinada' },
        ]}
      />

      <Select
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        options={[
          { value: '', label: 'All Statuses' },
          { value: 'valid', label: 'Valid Leads' },
          { value: 'duplicate', label: 'Duplicates' },
          { value: 'invalid', label: 'Invalid / Needs Review' },
        ]}
      />
    </>
  );
}

export default VendorFilters;
