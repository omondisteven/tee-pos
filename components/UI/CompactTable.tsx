'use client'

interface Column {
  key: string
  header: string
  align?: 'left' | 'center' | 'right'
  width?: string
  render?: (value: any, row: any) => React.ReactNode
}

interface CompactTableProps {
  columns: Column[]
  data: any[]
  onRowClick?: (row: any) => void
}

export default function CompactTable({ columns, data, onRowClick }: CompactTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick && onRowClick(row)}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-2 sm:px-3 py-1.5 whitespace-nowrap text-[11px] sm:text-xs ${
                      column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                    } text-gray-900 dark:text-gray-200`}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}