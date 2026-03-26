import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, Grid, List, X, ChevronDown } from 'lucide-react';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';
import { motion, AnimatePresence } from 'motion/react';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $100', min: 0, max: 100 },
  { label: '$100 – $300', min: 100, max: 300 },
  { label: '$300 – $1000', min: 300, max: 1000 },
  { label: 'Over $1000', min: 1000, max: Infinity },
];

export function ProductCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [sortBy, setSortBy] = useState('featured');
  const [minRating, setMinRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    MOCK_PRODUCTS.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, []);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
    const search = searchParams.get('search');
    if (search) setLocalSearch(search);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    let products = [...MOCK_PRODUCTS];
    const priceRange = PRICE_RANGES[selectedPriceRange];
    const featured = searchParams.get('featured');

    if (featured === 'true') products = products.filter(p => p.featured);
    if (selectedCategory !== 'All') products = products.filter(p => p.category === selectedCategory);
    if (localSearch) {
      const q = localSearch.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    products = products.filter(p => p.price >= priceRange.min && p.price < priceRange.max);
    if (minRating > 0) products = products.filter(p => p.rating >= minRating);
    if (selectedTags.length > 0) products = products.filter(p => selectedTags.some(t => p.tags.includes(t)));

    switch (sortBy) {
      case 'price-asc': products.sort((a, b) => a.price - b.price); break;
      case 'price-desc': products.sort((a, b) => b.price - a.price); break;
      case 'rating': products.sort((a, b) => b.rating - a.rating); break;
      case 'newest': products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      default: products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return products;
  }, [localSearch, selectedCategory, selectedPriceRange, sortBy, minRating, selectedTags, searchParams]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const clearFilters = () => {
    setSelectedCategory('All');
    setSelectedPriceRange(0);
    setMinRating(0);
    setSelectedTags([]);
    setLocalSearch('');
    setSearchParams({});
  };

  const hasActiveFilters = selectedCategory !== 'All' || selectedPriceRange !== 0 || minRating > 0 || selectedTags.length > 0 || localSearch;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Search</h4>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Category</h4>
        <div className="space-y-1">
          {['All', ...MOCK_CATEGORIES.map(c => c.name)].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat
                  ? 'bg-violet-100 text-violet-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{cat}</span>
              {cat !== 'All' && (
                <span className="text-xs text-gray-400">
                  {MOCK_PRODUCTS.filter(p => p.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Price Range</h4>
        <div className="space-y-1">
          {PRICE_RANGES.map((range, i) => (
            <button
              key={i}
              onClick={() => setSelectedPriceRange(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedPriceRange === i
                  ? 'bg-violet-100 text-violet-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Min Rating */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Minimum Rating</h4>
        <div className="flex gap-2 flex-wrap">
          {[0, 3, 4, 4.5].map(rating => (
            <button
              key={rating}
              onClick={() => setMinRating(rating)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                minRating === rating
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {rating === 0 ? 'All' : `${rating}+ ★`}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {allTags.slice(0, 12).map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <X className="w-4 h-4" /> Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                {selectedCategory === 'All' ? 'All Products' : selectedCategory}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{filteredProducts.length} products found</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && <span className="w-5 h-5 bg-white text-violet-600 rounded-full flex items-center justify-center text-xs font-bold">!</span>}
              </button>
            </div>
          </div>

          {/* Active Filter Pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedCategory !== 'All' && (
                <span className="flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('All')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {localSearch && (
                <span className="flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                  "{localSearch}"
                  <button onClick={() => setLocalSearch('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                  {tag}
                  <button onClick={() => toggleTag(tag)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-violet-600" /> Filters
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">
                    Clear all
                  </button>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          {/* Mobile Filter Drawer */}
          <AnimatePresence>
            {filtersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                  onClick={() => setFiltersOpen(false)}
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 30 }}
                  className="fixed inset-y-0 left-0 w-80 bg-white z-50 overflow-y-auto p-6 lg:hidden"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900 text-lg">Filters</h3>
                    <button onClick={() => setFiltersOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <FilterPanel />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">No products found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your filters or search terms</p>
                <button onClick={clearFilters} className="mt-5 px-6 py-2.5 bg-violet-600 text-white rounded-full text-sm font-medium">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={
                view === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                  : 'flex flex-col gap-4'
              }>
                {filteredProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <ProductCard product={product} view={view} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
