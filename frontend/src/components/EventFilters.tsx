import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CategoryFilter, StatusFilter } from '@/lib/event-listing'
import { EVENT_CATEGORIES, STATUS_LABELS } from '@/types/event'

interface EventFiltersProps {
  query: string
  category: CategoryFilter
  status: StatusFilter
  hasActiveFilters: boolean
  onQueryChange: (query: string) => void
  onCategoryChange: (category: CategoryFilter) => void
  onStatusChange: (status: StatusFilter) => void
  onClear: () => void
}

export function EventFilters({
  query,
  category,
  status,
  hasActiveFilters,
  onQueryChange,
  onCategoryChange,
  onStatusChange,
  onClear,
}: EventFiltersProps) {
  return (
    <section aria-label="Tìm và lọc sự kiện" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-2">
        <Label htmlFor="event-search">Tìm theo tên sự kiện</Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="event-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Nhập tên sự kiện"
            className="h-11 bg-card pl-10 text-base md:text-base"
          />
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <Label htmlFor="event-category">Danh mục</Label>
        <select
          id="event-category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value as CategoryFilter)}
          className="filter-select"
        >
          <option value="all">Tất cả danh mục</option>
          {EVENT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0 space-y-2">
        <Label htmlFor="event-status">Trạng thái đăng ký</Label>
        <select
          id="event-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
          className="filter-select"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="open">{STATUS_LABELS.open}</option>
          <option value="full">{STATUS_LABELS.full}</option>
          <option value="ended">{STATUS_LABELS.ended}</option>
        </select>
      </div>

      {hasActiveFilters && (
        <div className="lg:col-span-3">
          <Button type="button" variant="ghost" className="min-h-11 px-0 text-primary hover:bg-transparent hover:text-primary/80" onClick={onClear}>
            <X aria-hidden="true" />
            Xóa bộ lọc
          </Button>
        </div>
      )}
    </section>
  )
}
