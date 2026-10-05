import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../common/Input';

export function VendorSearch({ value, onChange, placeholder = 'Search business name, phone, city...' }) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      iconLeft={Search}
    />
  );
}

export default VendorSearch;
