/**
 * Vendor Query & State Hook
 * Location: frontend/src/hooks/useVendors.js
 */

import { useState, useMemo } from 'react';

export function useVendors(initialVendors = []) {
  const [vendors, setVendors] = useState(initialVendors);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        !searchTerm ||
        v.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.phone && v.phone.includes(searchTerm)) ||
        (v.city && v.city.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = !categoryFilter || v.category === categoryFilter;
      const matchesLocation = !locationFilter || v.city === locationFilter;
      const matchesStatus = !statusFilter || v.status === statusFilter;

      return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
    });
  }, [vendors, searchTerm, categoryFilter, locationFilter, statusFilter]);

  return {
    vendors: filteredVendors,
    rawVendors: vendors,
    setVendors,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    locationFilter,
    setLocationFilter,
    statusFilter,
    setStatusFilter,
    totalCount: filteredVendors.length,
  };
}

export default useVendors;
