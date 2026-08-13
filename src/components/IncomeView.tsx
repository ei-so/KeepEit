import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { IncomeItem } from '../types/vault';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Star,
  Trash2,
  Edit2,
  X,
  Check,
  Folder as FolderIcon,
  FileSpreadsheet,
} from 'lucide-react';

const CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Client Work',
  'Business',
  'Gift / Bonus',
  'Other',
];

export const IncomeView: React.FC = () => {
  const { vaultData, addIncome, updateIncome, deleteIncome, toggleIncomeFavorite } = useVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IncomeItem | null>(null);

  // Form State
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('PHP');
  const [category, setCategory] = useState('Salary');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [folderId, setFolderId] = useState<string>('');

  if (!vaultData) return null;

  const incomeList: IncomeItem[] = vaultData.income || [];

  // Filter & Sort
  const filteredIncome = incomeList
    .filter((item) => {
      const matchesSearch =
        item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.remarks || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  // Calculate Summary Cards metrics
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthTotal = incomeList
    .filter((i) => i.date.startsWith(currentMonthStr))
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const allTimeTotal = incomeList.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  // Top Category
  const catTotals: Record<string, number> = {};
  incomeList.forEach((i) => {
    catTotals[i.category] = (catTotals[i.category] || 0) + Number(i.amount || 0);
  });
  let topCat = 'N/A';
  let topCatMax = 0;
  Object.entries(catTotals).forEach(([cat, sum]) => {
    if (sum > topCatMax) {
      topCatMax = sum;
      topCat = cat;
    }
  });

  const entryCount = incomeList.length;

  const formatCurrency = (val: number, curr = 'PHP') => {
    const symbol = curr === 'PHP' ? '₱' : curr === 'USD' ? '$' : `${curr} `;
    return `${symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setSource('');
    setAmount('');
    setCurrency('PHP');
    setCategory('Salary');
    setDate(new Date().toISOString().slice(0, 10));
    setRemarks('');
    setFolderId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: IncomeItem) => {
    setEditingItem(item);
    setSource(item.source);
    setAmount(item.amount);
    setCurrency(item.currency || 'PHP');
    setCategory(item.category || 'Salary');
    setDate(item.date || new Date().toISOString().slice(0, 10));
    setRemarks(item.remarks || item.notes || '');
    setFolderId(item.folderId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || amount === '' || Number(amount) <= 0) return;

    if (editingItem) {
      await updateIncome({
        ...editingItem,
        source: source.trim(),
        amount: Number(amount),
        currency,
        category,
        date,
        remarks: remarks.trim() || undefined,
        folderId: folderId || undefined,
      });
    } else {
      await addIncome({
        source: source.trim(),
        amount: Number(amount),
        currency,
        category,
        date,
        remarks: remarks.trim() || undefined,
        folderId: folderId || undefined,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] overflow-y-auto">
      {/* Header Bar */}
      <div className="p-6 border-b border-keepeit bg-[var(--bg-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[var(--accent-seal)]" />
              Income Directory & Analytics
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Encrypted ledger for earnings, salary records, freelance payouts, and investment returns.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>RECORD INCOME</span>
          </button>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {/* Card 1: This Month */}
          <div className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-1">
            <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-[var(--accent-seal)]" />
              THIS MONTH
            </span>
            <p className="font-mono text-base font-bold text-[var(--accent-seal)] truncate">
              {formatCurrency(thisMonthTotal)}
            </p>
          </div>

          {/* Card 2: All-Time */}
          <div className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-1">
            <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-seal)]" />
              ALL-TIME TOTAL
            </span>
            <p className="font-mono text-base font-bold text-[var(--text-primary)] truncate">
              {formatCurrency(allTimeTotal)}
            </p>
          </div>

          {/* Card 3: Top Category */}
          <div className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-1">
            <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5 text-amber-500" />
              TOP CATEGORY
            </span>
            <p className="font-semibold text-xs text-[var(--text-primary)] truncate">
              {topCat}{' '}
              {topCatMax > 0 && (
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  ({formatCurrency(topCatMax)})
                </span>
              )}
            </p>
          </div>

          {/* Card 4: Entry Count */}
          <div className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-1">
            <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--accent-seal)]" />
              TOTAL ENTRIES
            </span>
            <p className="font-mono text-base font-bold text-[var(--text-primary)]">
              {entryCount} <span className="text-xs font-normal text-[var(--text-muted)]">records</span>
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search source, remarks, or category..."
              className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit pl-9 pr-3 py-2 text-xs font-sans text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-seal)]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono-label text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">ALL CATEGORIES</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-1 shrink-0"
              title="Sort by date"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--accent-seal)]" />
              <span>{sortOrder === 'desc' ? 'NEWEST FIRST' : 'OLDEST FIRST'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Income Ledger Table */}
      <div className="p-6">
        {filteredIncome.length === 0 ? (
          <div className="p-12 text-center bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3 max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">No Income Records Found</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {searchQuery || selectedCategory !== 'all'
                ? 'No income entries match your current search criteria or category filter.'
                : 'Start tracking your financial earnings by recording your first income entry above.'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <button
                onClick={handleOpenAddModal}
                className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> RECORD FIRST ENTRY
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-surface)] border-b border-keepeit font-mono-label text-[10px] text-[var(--text-muted)]">
                  <tr>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">SOURCE</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4">REMARKS / NOTES</th>
                    <th className="py-3 px-4 text-right">AMOUNT</th>
                    <th className="py-3 px-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-keepeit font-sans text-[var(--text-primary)]">
                  {filteredIncome.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[var(--bg-surface-hover)] transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap text-[var(--text-muted)]">
                        {item.date}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 font-semibold text-xs text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <span>{item.source}</span>
                          {item.isFavorite && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Category Chip */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-[var(--accent-seal-soft)]/40 text-[var(--accent-seal)] font-mono-label text-[10px] rounded-keepeit font-semibold">
                          {item.category.toUpperCase()}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4 text-xs text-[var(--text-muted)] max-w-xs truncate">
                        {item.remarks || item.notes || '—'}
                      </td>

                      {/* Amount Right-Aligned in Mono */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-[var(--accent-seal)] text-right whitespace-nowrap">
                        + {formatCurrency(item.amount, item.currency)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleIncomeFavorite(item.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-amber-500"
                            title={item.isFavorite ? 'Unstar Entry' : 'Star Entry'}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                item.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="Edit Entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteIncome(item.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-rust)]"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-keepeit pb-3">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[var(--accent-seal)]" />
                {editingItem ? 'Edit Income Entry' : 'Record New Income'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              {/* Source */}
              <div className="space-y-1 w-full min-w-0">
                <label className="font-mono-label text-[var(--text-muted)] block">INCOME SOURCE *</label>
                <input
                  type="text"
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Monthly Salary, Acme Corp Freelance"
                  className="w-full min-w-0 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-seal)]"
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1 w-full min-w-0">
                  <label className="font-mono-label text-[var(--text-muted)] block">AMOUNT *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="25000.00"
                    className="w-full min-w-0 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-seal)]"
                  />
                </div>

                <div className="space-y-1 w-full min-w-0">
                  <label className="font-mono-label text-[var(--text-muted)] block">CURRENCY</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full min-w-0 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-2 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="PHP">PHP (₱)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="SGD">SGD ($)</option>
                  </select>
                </div>
              </div>

              {/* Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 w-full min-w-0">
                  <label className="font-mono-label text-[var(--text-muted)] block">DATE *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full min-w-0 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1 w-full min-w-0">
                  <label className="font-mono-label text-[var(--text-muted)] block">CATEGORY</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-w-0 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks / Notes */}
              <div className="space-y-1">
                <label className="font-mono-label text-[var(--text-muted)] block">REMARKS / NOTES</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional details, invoice #, client references..."
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit p-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {/* Folder */}
              {vaultData.folders.length > 0 && (
                <div className="space-y-1">
                  <label className="font-mono-label text-[var(--text-muted)] block">ASSIGN FOLDER</label>
                  <select
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">(No Folder)</option>
                    {vaultData.folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-keepeit flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit font-mono-label text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B]"
                >
                  {editingItem ? 'SAVE CHANGES' : 'RECORD ENTRY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
