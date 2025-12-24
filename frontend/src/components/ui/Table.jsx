import React from 'react'
import styles from './Table.module.css'

/**
 * Table component with sorting, pagination, and empty state
 */
export default function Table({
    columns,
    data,
    onRowClick,
    emptyMessage = 'No data available',
    className = ''
}) {
    const classes = [
        styles.tableWrapper,
        onRowClick && styles.clickable,
        className
    ].filter(Boolean).join(' ')

    if (!data || data.length === 0) {
        return (
            <div className={styles.tableWrapper}>
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>📭</div>
                    <p>{emptyMessage}</p>
                </div>
            </div>
        )
    }

    return (
        <div className={classes}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} style={col.width ? { width: col.width } : undefined}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr
                            key={row.id || rowIdx}
                            onClick={() => onRowClick && onRowClick(row)}
                        >
                            {columns.map((col, colIdx) => (
                                <td key={colIdx}>
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/**
 * Pagination component
 */
export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    className = ''
}) {
    const startItem = ((currentPage - 1) * pageSize) + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    const pages = []
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            pages.push(i)
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...')
        }
    }

    return (
        <div className={`${styles.pagination} ${className}`}>
            <div className={styles.paginationInfo}>
                Showing {startItem} to {endItem} of {totalItems} results
            </div>
            <div className={styles.paginationButtons}>
                <button
                    className={styles.paginationBtn}
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                {pages.map((page, idx) => (
                    page === '...' ? (
                        <span key={idx} className={styles.paginationBtn}>...</span>
                    ) : (
                        <button
                            key={idx}
                            className={`${styles.paginationBtn} ${page === currentPage ? styles.paginationBtnActive : ''}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    )
                ))}
                <button
                    className={styles.paginationBtn}
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    )
}
