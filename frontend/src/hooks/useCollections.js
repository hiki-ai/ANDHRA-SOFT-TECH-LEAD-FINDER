/**
 * Collections Query & State Hook
 * Location: frontend/src/hooks/useCollections.js
 */

import { useState, useMemo } from 'react';

export function useCollections(initialCollections = []) {
  const [collections, setCollections] = useState(initialCollections);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [collections, searchTerm, statusFilter]);

  return {
    collections: filteredCollections,
    rawCollections: collections,
    setCollections,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  };
}

export default useCollections;
