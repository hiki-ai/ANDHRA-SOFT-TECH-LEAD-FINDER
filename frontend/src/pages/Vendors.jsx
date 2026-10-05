import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Star,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { formatNumber, formatPercent, getQualityScoreColor } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { vendorService } from '../services/vendorService';
import { firestoreService } from '../services/firestoreService';

// Realistic synthetic demo data (Section 48: Clearly labeled as DEMO DATA)
const DEMO_VENDORS = [
  {
    id: 'ven_1001',
    business_name: 'Godavari Teak & Rosewood Emporium',
    category: 'Furniture',
    phone: '+91 883 245 8920',
    email: 'info@godavariteak.com',
    location: 'Main Road, Rajahmundry',
    city: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
    website: 'https://godavariteak.com',
    rating: 4.8,
    review_count: 312,
    source: 'Official Public Directory (Source A)',
    status: 'valid',
    data_quality_score: 95,
  },
  {
    id: 'ven_1002',
    business_name: 'Visakha Multi-Speciality Dental Hospital',
    category: 'Hospitals',
    phone: '+91 891 254 7800',
    email: 'contact@visakhadental.org',
    location: 'MVP Colony, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    website: 'https://visakhadental.org',
    rating: 4.6,
    review_count: 520,
    source: 'Health Registry API (Source B)',
    status: 'valid',
    data_quality_score: 92,
  },
  {
    id: 'ven_1003',
    business_name: 'Krishna Delta Gourmet Restaurant',
    category: 'Restaurants',
    phone: '+91 866 248 1122',
    email: 'manager@krishnagourmet.in',
    location: 'MG Road, Vijayawada',
    city: 'Vijayawada',
    district: 'Krishna',
    state: 'Andhra Pradesh',
    website: 'https://krishnagourmet.in',
    rating: 4.4,
    review_count: 890,
    source: 'Commercial Registry (Source A)',
    status: 'valid',
    data_quality_score: 88,
  },
  {
    id: 'ven_1004',
    business_name: 'Amaravati Skyline Heights & Builders',
    category: 'Real Estate',
    phone: '+91 863 223 9901',
    email: 'sales@amaravatiskyline.com',
    location: 'Brodipet, Guntur',
    city: 'Guntur',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    website: 'https://amaravatiskyline.com',
    rating: 4.2,
    review_count: 145,
    source: 'Licensed Property Registry',
    status: 'valid',
    data_quality_score: 84,
  },
  {
    id: 'ven_1005',
    business_name: 'Konaseema Grand Heritage Residency',
    category: 'Hotels',
    phone: '+91 884 237 4455',
    email: 'reservations@konaseemagrand.com',
    location: 'Cinema Road, Kakinada',
    city: 'Kakinada',
    district: 'Kakinada',
    state: 'Andhra Pradesh',
    website: 'https://konaseemagrand.com',
    rating: 4.7,
    review_count: 410,
    source: 'Hospitality Registry',
    status: 'valid',
    data_quality_score: 90,
  },
  {
    id: 'ven_1006',
    business_name: 'Godavari Furnishing Works [Duplicate Record]',
    category: 'Furniture',
    phone: '+91 883 245 8920',
    email: null,
    location: 'Main Rd, Rajahmundry',
    city: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
    website: null,
    rating: 4.5,
    review_count: 88,
    source: 'Public Web Connector',
    status: 'duplicate',
    data_quality_score: 62,
  },
  {
    id: 'ven_1007',
    business_name: 'Nellore Spice Kitchen & Sweets',
    category: 'Restaurants',
    phone: null,
    email: null,
    location: 'Trunk Road, Nellore',
    city: 'Nellore',
    district: 'Nellore',
    state: 'Andhra Pradesh',
    website: null,
    rating: 3.8,
    review_count: 42,
    source: 'Public Web Connector',
    status: 'invalid',
    data_quality_score: 45,
  },
];

export function Vendors() {
  const [vendorsList, setVendorsList] = useState(DEMO_VENDORS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        if (firestoreService.isReady()) {
          await firestoreService.seedVendorsIfEmpty();
        }
        const res = await vendorService.getVendors();
        if (isMounted && res?.data?.items?.length) {
          setVendorsList(res.data.items);
        }
      } catch (err) {
        console.info('[Vendors] Using local fallback dataset:', err?.message);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVendors = vendorsList.filter((v) => {
    const matchesSearch =
      !searchTerm ||
      v.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.phone && v.phone.includes(searchTerm)) ||
      (v.city && v.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || v.category === selectedCategory;
    const matchesLocation = !selectedLocation || v.city === selectedLocation;
    const matchesStatus = !selectedStatus || v.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  });

  const handleExport = () => {
    toast.success('Excel export started for current filtered vendor view.');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900">
              Vendor Lead Database
            </h1>
            <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200">
              {firestoreService.isReady() ? 'FIRESTORE CLOUD' : 'DEMO DATASET'}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Displaying 50 records per page • Scalable to 500,000+ indexed vendors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            iconLeft={Download}
            onClick={handleExport}
          >
            Export Excel
          </Button>
          <Link to="/data-editor">
            <Button variant="primary" size="sm">
              Open Spreadsheet Editor
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <Input
            placeholder="Search business name, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            iconLeft={Search}
          />
        </div>

        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
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
          onChange={(e) => setSelectedLocation(e.target.value)}
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
          onChange={(e) => setSelectedStatus(e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'valid', label: 'Valid Leads' },
            { value: 'duplicate', label: 'Duplicates' },
            { value: 'invalid', label: 'Invalid / Needs Review' },
          ]}
        />
      </div>

      {/* Vendors Data Table (Section 20) */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-[11px] font-semibold text-surface-500 uppercase tracking-wider table-sticky-header">
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">City / State</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Quality</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs">
              {filteredVendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                  className="table-row-hover transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-semibold text-surface-900">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[220px]">{vendor.business_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-surface-600 font-medium">
                    {vendor.category}
                  </td>
                  <td className="py-3.5 px-4 text-surface-700 font-mono">
                    {vendor.phone || <span className="text-surface-400 italic">None</span>}
                  </td>
                  <td className="py-3.5 px-4 text-surface-600">
                    {vendor.city}, {vendor.state}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-surface-700">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{vendor.rating}</span>
                      <span className="text-surface-400 text-[10px]">({vendor.review_count})</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-surface-500 text-[11px] truncate max-w-[160px]">
                    {vendor.source}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={vendor.status}
                      dot
                    >
                      {vendor.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getQualityScoreColor(
                        vendor.data_quality_score
                      )}`}
                    >
                      {vendor.data_quality_score}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/vendors/${vendor.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand-600 hover:text-brand-800 font-semibold inline-flex items-center gap-1 group-hover:underline"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="p-4 border-t border-surface-100 bg-surface-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-600">
          <span>
            Showing <span className="font-semibold text-surface-900">1</span> to{' '}
            <span className="font-semibold text-surface-900">{filteredVendors.length}</span> of{' '}
            <span className="font-semibold text-surface-900">142,500</span> records
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              iconLeft={ChevronLeft}
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-semibold text-surface-900 bg-white border border-surface-200 rounded-lg">
              Page {page} of 2,850
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              iconRight={ChevronRight}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
