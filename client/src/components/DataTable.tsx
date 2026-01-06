import React, { useMemo, useState, useEffect } from 'react';
import { FiMenu } from 'react-icons/fi';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  initialPageSize?: number;
  className?: string;
};

export default function DataTable<T>({ data, columns, initialPageSize = 10, className }: Props<T>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string | string[]>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuSearches, setMenuSearches] = useState<Record<string, string>>({});
  const [columnSorts, setColumnSorts] = useState<Record<string, 'none' | 'asc' | 'desc'>>({});

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      // close menu when clicking outside
      setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Helper to get cell value using column accessorFn or accessorKey
  const getCellValue = (row: any, col: ColumnDef<T, any>) => {
    try {
      // @ts-ignore
      if (typeof col.accessorFn === 'function') return (col.accessorFn as any)(row);
      // @ts-ignore
      if (col.accessorKey && (row as any)[col.accessorKey] !== undefined) return (row as any)[col.accessorKey];
    } catch (e) {
      // ignore
    }
    return '';
  };

  // Apply filters locally so we can support multi-value filters and custom menu
  const filteredData = useMemo(() => {
    const gf = String(globalFilter || '').trim().toLowerCase();
    return data.filter((row) => {
      // global filter: check any column text
      if (gf) {
        let found = false;
        for (const col of columns) {
          const v = getCellValue(row as any, col as any);
          if (String(v ?? '').toLowerCase().includes(gf)) { found = true; break; }
        }
        if (!found) return false;
      }

      // per-column filters
      for (const [cid, fv] of Object.entries(columnFilters)) {
        if (fv === '' || fv === undefined) continue;
        const col = columns.find(c => {
          // Try to match by id
          if ((c as any).id === cid) return true;
          // Try to match by accessorKey if present in columnDef
          if ((c as any).accessorKey === cid) return true;
          if ((c as any).columnDef && (c as any).columnDef.accessorKey === cid) return true;
          return false;
        });
        if (!col) continue;
        const v = String(getCellValue(row as any, col as any) ?? '');
        if (typeof fv === 'object' && fv !== null && !Array.isArray(fv)) {
          // Address structural filter
          // fv is { province?: string, amphoe?: string, tambon?: string, zipcode?: string }
          // row data for address fields is spread on the row object (from Contact type)
          const map = ((col as any).meta as any)?.addressFieldMap;
          if (map) {
            const r = row as any;
            const f = fv as any;
            if (f.province && String(r[map.province] || '').trim() !== f.province) return false;
            if (f.amphoe && String(r[map.amphoe] || '').trim() !== f.amphoe) return false;
            if (f.tambon && String(r[map.tambon] || '').trim() !== f.tambon) return false;
            if (f.zipcode && String(r[map.zipcode] || '').trim() !== f.zipcode) return false;
            // If we passed all checks, continue to next column filter
          }
        } else if (Array.isArray(fv)) {
          // array = selected exact values
          if (!fv.map(x => String(x)).includes(v)) return false;
        } else {
          // string = substring match
          if (!v.toLowerCase().includes(String(fv).toLowerCase())) return false;
        }
      }

      return true;
    });
  }, [data, columns, globalFilter, columnFilters]);

  const table = useReactTable({
    data: filteredData as any,
    columns,
    state: { globalFilter: globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: false,
  });

  // keep local columnSorts in sync with table sorting state
  const currentSorting = table.getState().sorting;
  useEffect(() => {
    const next: Record<string, 'none' | 'asc' | 'desc'> = {};
    if (Array.isArray(currentSorting)) {
      currentSorting.forEach((s: any) => {
        if (!s || !s.id) return;
        next[s.id] = s.desc ? 'desc' : 'asc';
      });
    }
    // mark other known columns as none
    columns.forEach((c) => {
      const id = (c as any).id ?? (c as any).accessorKey ?? '';
      if (id && !next[id]) next[id] = 'none';
    });
    setColumnSorts(next);
  }, [currentSorting, columns]);

  return (
    <div className={className ?? ''}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <label className="form-label mb-0">entries per page</label>
          <select
            className="form-select form-select-sm"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            style={{ width: 90 }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="text-muted">Search:</div>
          <input
            className="form-control form-control-sm"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            style={{ minWidth: 200 }}
          />
        </div>
      </div>

      <div className="table-responsive" style={{ overflow: 'visible' }}>
        <table className="table table-hover align-middle mb-0">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} style={{ position: 'relative', overflow: 'visible', verticalAlign: 'middle', lineHeight: 1.2 }}>
                    {header.isPlaceholder ? null : (() => {
                      const meta = (header.column.columnDef as any).meta;
                      const hideMenu = header.column.id === 'actions' || meta?.noMenu;
                      const alignStyle = meta?.headerAlign === 'center' ? { justifyContent: 'center', width: '100%' } : { justifyContent: 'space-between' };
                      return (
                        <div style={{ position: 'relative' }}>
                          <div className="d-flex align-items-center" style={{ gap: 8, minHeight: 32, ...alignStyle }}>
                            <div style={{ fontWeight: 600 }}>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                            {!hideMenu ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {/* Sort toggle button (cycles: none -> desc -> asc -> none) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const colId = header.column.id;
                                    const cur = columnSorts[colId] ?? 'none';
                                    const next = cur === 'none' ? 'desc' : (cur === 'desc' ? 'asc' : 'none');
                                    if (next === 'none') {
                                      table.setSorting([]);
                                    } else {
                                      table.setSorting([{ id: header.column.id, desc: next === 'desc' }]);
                                    }
                                    setColumnSorts(prev => ({ ...prev, [colId]: next }));
                                  }}
                                  aria-label="toggle sort"
                                  title="Toggle sort"
                                  style={{
                                    width: 34,
                                    height: 34,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                    border: '1px solid transparent',
                                    background: 'transparent',
                                    padding: 0,
                                    boxSizing: 'border-box',
                                    cursor: 'pointer',
                                    color: '#374151',
                                    transition: 'background-color 120ms ease, box-shadow 120ms ease',
                                    outline: 'none',
                                    boxShadow: 'none',
                                  }}
                                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#f3f4f6'; el.style.boxShadow = 'none'; }}
                                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.boxShadow = 'none'; }}
                                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                >
                                  {(() => {
                                    const state = columnSorts[header.id] ?? 'none';
                                    const iconStyle: React.CSSProperties = { width: 18, height: 18, display: 'block' };
                                    if (state === 'asc') {
                                      return (
                                        <svg viewBox="0 0 24 24" fill="none" style={iconStyle} xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                          <path d="M8 20V10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                          <path d="M5.5 12.5L8 10l2.5 2.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                          <path d="M14 8h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                          <path d="M14 12h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                          <path d="M14 16h3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                        </svg>
                                      );
                                    }
                                    if (state === 'desc') {
                                      return (
                                        <svg viewBox="0 0 24 24" fill="none" style={iconStyle} xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                          <path d="M8 4v10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                          <path d="M5.5 11.5L8 14l2.5-2.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                          <path d="M14 8h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                          <path d="M14 12h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                          <path d="M14 16h3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                        </svg>
                                      );
                                    }
                                    // neutral (up/down pair)
                                    return (
                                      <svg viewBox="0 0 24 24" fill="none" style={iconStyle} xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <path d="M7 9.5L9.5 7l2.5 2.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M7 14.5L9.5 17l2.5-2.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    );
                                  })()}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === header.id ? null : header.id); }}
                                  aria-label="column menu"
                                  style={{ padding: 0, marginLeft: -4, borderRadius: 6, background: 'transparent', border: '1px solid transparent', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', cursor: 'pointer', color: '#374151', transition: 'background-color 120ms ease, box-shadow 120ms ease', outline: 'none', boxShadow: 'none' }}
                                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#f3f4f6'; el.style.boxShadow = 'none'; }}
                                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.boxShadow = 'none'; }}
                                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                >
                                  <FiMenu color="#374151" size={18} />
                                </button>
                              </div>
                            ) : null}
                          </div>

                          {!hideMenu && openMenu === header.id && (
                            <div
                              className="card"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                marginTop: '4px',
                                right: 0,
                                zIndex: 1200,
                                width: 250,
                                maxHeight: '80vh',
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#ffffff',
                                color: '#1f2937',
                                borderRadius: 8,
                                border: '1px solid #e5e7eb',
                                padding: 0,
                                overflow: 'hidden'
                              }}

                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ padding: '12px 12px 8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const vals = Array.from(new Set(data.map((r: any) => String(getCellValue(r, header.column.columnDef as any) ?? '')))).filter(v => v !== '');
                                      setColumnFilters(prev => ({ ...prev, [header.id]: vals }));
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      fontWeight: 600,
                                      color: '#374151',
                                      transition: 'color 0.15s ease',
                                      outline: 'none',
                                      boxShadow: 'none'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#111827'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#374151'; }}
                                  >
                                    Select all ({Array.from(new Set(data.map((r: any) => String(getCellValue(r, header.column.columnDef as any) ?? '')))).filter(v => v !== '').length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setColumnFilters(prev => { const n = { ...prev }; delete n[header.id]; return n; })}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: '#9ca3af',
                                      transition: 'color 0.15s ease',
                                      outline: 'none',
                                      boxShadow: 'none'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#4b5563'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                                  >
                                    Deselect
                                  </button>
                                </div>

                                <div className="mb-2">
                                  <input
                                    className="form-control form-control-sm"
                                    placeholder="Search..."
                                    value={menuSearches[header.id] ?? ''}
                                    onChange={(e) => setMenuSearches(s => ({ ...s, [header.id]: e.target.value }))}
                                    style={{
                                      backgroundColor: '#ffffff',
                                      border: '1px solid #d1d5db',
                                      color: '#1f2937',
                                      borderRadius: 6,
                                      padding: '6px 10px'
                                    }}
                                  />
                                </div>

                                {/* unique values list */}
                                <div className="custom-scrollbar" style={{ maxHeight: 200, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
                                  {(() => {
                                    // Check for address filter variant
                                    const variant = (header.column.columnDef.meta as any)?.filterVariant;
                                    if (variant === 'address') {
                                      const fieldMap = (header.column.columnDef.meta as any)?.addressFieldMap;
                                      const currentFilter = (columnFilters[header.id] as any) || {};

                                      // Helper to get unique values for a specific field
                                      const getOptions = (field: string) => {
                                        return Array.from(new Set(data.map((r: any) => String(r[field] || '').trim()))).filter(Boolean).sort();
                                      };

                                      const provinces = getOptions(fieldMap?.province || 'province');
                                      const amphoes = getOptions(fieldMap?.amphoe || 'amphoe');
                                      const tambons = getOptions(fieldMap?.tambon || 'tambon');
                                      const zipcodes = getOptions(fieldMap?.zipcode || 'zipcode');

                                      const updateFilter = (key: string, val: string) => {
                                        const next = { ...currentFilter, [key]: val };
                                        if (!val) delete next[key];
                                        if (Object.keys(next).length === 0) {
                                          setColumnFilters(prev => { const n = { ...prev }; delete n[header.id]; return n; });
                                        } else {
                                          setColumnFilters(prev => ({ ...prev, [header.id]: next }));
                                        }
                                      };

                                      const SelectField = ({ label, options, value, onChange }: any) => (
                                        <div className="mb-2">
                                          <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 2, display: 'block' }}>{label}</label>
                                          <select
                                            className="form-select form-select-sm"
                                            value={value || ''}
                                            onChange={e => onChange(e.target.value)}
                                            style={{ fontSize: '0.85rem' }}
                                          >
                                            <option value="">All</option>
                                            {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                          </select>
                                        </div>
                                      );

                                      return (
                                        <div style={{ padding: '12px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>Filter Address</div>
                                            <button
                                              type="button"
                                              className="btn btn-link p-0 text-decoration-none"
                                              onClick={() => setColumnFilters(prev => { const n = { ...prev }; delete n[header.id]; return n; })}
                                              style={{ color: '#6b7280', fontSize: '0.85rem' }}
                                            >
                                              Clear
                                            </button>
                                          </div>
                                          <SelectField label="Province" options={provinces} value={currentFilter.province} onChange={(v: string) => updateFilter('province', v)} />
                                          <SelectField label="District (Amphoe)" options={amphoes} value={currentFilter.amphoe} onChange={(v: string) => updateFilter('amphoe', v)} />
                                          <SelectField label="Sub-district (Tambon)" options={tambons} value={currentFilter.tambon} onChange={(v: string) => updateFilter('tambon', v)} />
                                          <SelectField label="Zipcode" options={zipcodes} value={currentFilter.zipcode} onChange={(v: string) => updateFilter('zipcode', v)} />
                                        </div>
                                      );
                                    }

                                    // Standard filter UI
                                    // build unique values for this column
                                    const values = Array.from(new Set(data.map((r: any) => String(getCellValue(r, header.column.columnDef as any) ?? '')))).filter(v => v !== '');
                                    const q = (menuSearches[header.id] ?? '').toLowerCase().trim();
                                    const shown = q ? values.filter(v => v.toLowerCase().includes(q)) : values;
                                    if (shown.length === 0) return <div className="text-muted small py-2 text-center">No matches</div>;
                                    return shown.map((v) => {
                                      const selected = Array.isArray(columnFilters[header.id]) ? (columnFilters[header.id] as string[]).includes(v) : false;
                                      return (
                                        <div
                                          key={v}
                                          className="filter-item"
                                          onClick={() => {
                                            setColumnFilters(prev => {
                                              const cur = Array.isArray(prev[header.id]) ? [...(prev[header.id] as string[])] : [];
                                              if (!selected) {
                                                cur.push(v);
                                              } else {
                                                const idx = cur.indexOf(v);
                                                if (idx >= 0) cur.splice(idx, 1);
                                              }
                                              if (cur.length === 0) {
                                                const next = { ...prev };
                                                delete next[header.id];
                                                return next;
                                              }
                                              return { ...prev, [header.id]: cur };
                                            });
                                          }}
                                          style={{
                                            padding: '8px 8px',
                                            cursor: 'pointer',
                                            borderRadius: 4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: '#374151',
                                            transition: 'background-color 0.1s'
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          {selected && (
                                            <div style={{ width: 4, height: 14, backgroundColor: '#3b82f6', borderRadius: 2, marginRight: 8 }}></div>
                                          )}
                                          <span style={{ fontSize: '0.9rem', flex: 1, fontWeight: selected ? 500 : 400 }}>{v}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>

                              {/* Footer Actions */}
                              <div style={{ borderTop: '1px solid #e5e7eb', padding: '4px 0' }}>
                                {(() => {
                                  const sortingState = table.getState().sorting;
                                  const cur = Array.isArray(sortingState) && sortingState.length > 0 ? sortingState[0] : null;
                                  const isAsc = cur && cur.id === header.column.id && !cur.desc;
                                  const isDesc = cur && cur.id === header.column.id && !!cur.desc;

                                  const MenuItem = ({ label, icon, onClick, active }: any) => (
                                    <div
                                      onClick={onClick}
                                      style={{
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        fontSize: '0.9rem',
                                        color: active ? '#2563eb' : '#4b5563',
                                        backgroundColor: active ? '#eff6ff' : 'transparent'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = active ? '#eff6ff' : 'transparent'}
                                    >
                                      {icon}
                                      <span>{label}</span>
                                    </div>
                                  );

                                  return (
                                    <>
                                      <MenuItem
                                        label="Sort Ascending"
                                        active={isAsc}
                                        onClick={() => table.setSorting([{ id: header.column.id, desc: false }])}
                                        icon={(
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M3 12h12M3 18h6" />
                                          </svg>
                                        )}
                                      />
                                      <MenuItem
                                        label="Sort Descending"
                                        active={isDesc}
                                        onClick={() => table.setSorting([{ id: header.column.id, desc: true }])}
                                        icon={(
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 18h18M3 12h12M3 6h6" />
                                          </svg>
                                        )}
                                      />
                                      <MenuItem
                                        label="Clear sort"
                                        onClick={() => table.setSorting([])}
                                        icon={(
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        )}
                                      />
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* column menu dropdown moved inside header render to respect hideMenu */}

                    {/* Filtering moved into the column menu */}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">
                  No results
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-end align-items-center mt-3 gap-1">
        <button
          className="btn p-0 d-flex align-items-center justify-content-center"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            border: 'none',
            background: 'transparent',
            borderRadius: 8,
            cursor: !table.getCanPreviousPage() ? 'not-allowed' : 'pointer',
            color: '#6b7280',
            transition: 'background-color 0.15s',
            opacity: !table.getCanPreviousPage() ? 0.5 : 1
          }}
          onMouseEnter={(e) => { if (table.getCanPreviousPage()) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          &lt;
        </button>

        {/* Page Numbers */}
        {(() => {
          const pageCount = table.getPageCount();
          const current = table.getState().pagination.pageIndex;
          // Simple logic: render all if small, otherwise could complicate. 
          // For now, let's render all since typical usage might not be huge, or just simple list.
          // User asked for "show number 1".
          // If 0 pages (empty data), show nothing or 1? "If single page show 1".
          const count = Math.max(1, pageCount);
          return Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => table.setPageIndex(i)}
              className="btn p-0 d-flex align-items-center justify-content-center"
              style={{
                width: 36,
                height: 36,
                minWidth: 36,
                border: 'none',
                background: i === current ? '#eff6ff' : 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                color: i === current ? '#2563eb' : '#4b5563',
                fontWeight: i === current ? 600 : 400,
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => { if (i !== current) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
              onMouseLeave={(e) => { if (i !== current) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {i + 1}
            </button>
          ));
        })()}

        <button
          className="btn p-0 d-flex align-items-center justify-content-center"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            border: 'none',
            background: 'transparent',
            borderRadius: 8,
            cursor: !table.getCanNextPage() ? 'not-allowed' : 'pointer',
            color: '#6b7280',
            transition: 'background-color 0.15s',
            opacity: !table.getCanNextPage() ? 0.5 : 1
          }}
          onMouseEnter={(e) => { if (table.getCanNextPage()) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
