"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, Copy, Check, Table, Search, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Column {
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface DataTableProps {
  title?: string
  data: any[]
  columns: Column[]
  className?: string
  pagination?: boolean
  pageSize?: number
}

export function DataTable({
  title = "Data Table",
  data = [],
  columns = [],
  className,
  pagination = true,
  pageSize = 10
}: DataTableProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Handle copy data
  const handleCopyData = async () => {
    const dataString = JSON.stringify(data, null, 2)
    await navigator.clipboard.writeText(dataString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle download CSV
  const handleDownloadCSV = () => {
    // Create CSV content
    const headers = columns.map(col => col.title).join(',')
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key]
        // Handle values with commas by wrapping in quotes
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value
      }).join(',')
    ).join('\n')

    const csvContent = `${headers}\n${rows}`

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${title.replace(/\s+/g, '-').toLowerCase()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle sort
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'

    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'
    }

    setSortConfig({ key, direction })
  }

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  // Apply sorting, filtering and pagination
  const processedData = (() => {
    // First apply search across all columns
    let result = searchQuery
      ? data.filter(row =>
          columns.some(col =>
            String(row[col.key]).toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
      : [...data]

    // Then apply column-specific filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row =>
          String(row[key]).toLowerCase().includes(value.toLowerCase())
        )
      }
    })

    // Then apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return result
  })()

  // Calculate pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const paginatedData = pagination
    ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processedData

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background",
        expanded && "fixed inset-4 z-50 bg-background flex flex-col",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-800 to-blue-700 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4" />
          <span className="font-medium">{title}</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleCopyData}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="sr-only">Copy data</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleDownloadCSV}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download CSV</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="sr-only">{expanded ? "Minimize" : "Maximize"}</span>
          </Button>
        </motion.div>
      </div>

      <div className={cn(
        "flex flex-col",
        expanded ? "flex-1" : "max-h-[400px]"
      )}>
        {/* Search bar */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search all columns..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {columns.map((column, i) => (
                  <th key={i} className="px-4 py-2 text-left font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <span>{column.title}</span>
                      {column.sortable && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSort(column.key)}
                          className="h-5 w-5 rounded-full hover:bg-muted"
                        >
                          {sortConfig?.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    {column.filterable && (
                      <div className="mt-1">
                        <Input
                          type="text"
                          placeholder={`Filter ${column.title}...`}
                          className="h-6 text-xs"
                          value={filters[column.key] || ''}
                          onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    {columns.map((column, colIndex) => (
                      <td key={colIndex} className="px-4 py-2 text-sm">
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="p-2 border-t flex items-center justify-between bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
