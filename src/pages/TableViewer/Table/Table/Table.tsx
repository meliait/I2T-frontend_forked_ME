import { Row, useGlobalFilter, useTable } from 'react-table';
import {
  FC, useCallback,
  useEffect
} from 'react';
import { MetadataInstance } from '@store/slices/table/interfaces/table';
import TableHead from '../TableHead';
import TableHeaderCell from '../TableHeaderCell';
import TableRoot from '../TableRoot';
import TableRowCell from '../TableRowCell';
import TableRow from '../TableRow';
import TableFooter from '../TableFooter';

interface TableProps {
  columns: any[];
  data: any[];
  searchFilter?: TableGlobalFilter;
  dense?: boolean;
  getGlobalProps: () => any;
  getHeaderProps: (col: any) => any;
  getCellProps: (cell: any) => any;
}

interface TableGlobalFilter {
  filter: string;
  value: string;
}

// default prop getter for when it is not provided
const defaultPropGetter = () => ({});

const Table: FC<TableProps> = ({
  columns,
  data,
  searchFilter,
  dense = false,
  getGlobalProps = defaultPropGetter,
  getHeaderProps = defaultPropGetter,
  getCellProps = defaultPropGetter
}) => {
  /**
   * Custom function id.
   */
  const getRowId = useCallback((row: any, relativeIndex: number, parent?: Row<any> | undefined) => {
    return (parent ? [parent.id, relativeIndex].join('.') : row[Object.keys(row)[0]].rowId) as string;
  }, []);

  /**
 * Returns row which have at least a cell with label which starts with filter value.
 */
  const filterAll = useCallback((
    rows: Array<Row>, colIds: Array<string>, filterValue: string
  ) => {
    return rows.filter((row) => colIds
      .some((colId) => row.values[colId].label
        .toLowerCase()
        .startsWith(filterValue.toLowerCase())));
  }, []);

  /**
   * Returns row which have at least a cell with metadata name which starts with filter value.
   */
  const filterMeta = useCallback((
    rows: Array<Row>, colIds: Array<string>, filterValue: string
  ) => {
    return rows.filter((row) => colIds
      .some((colId) => row.values[colId].metadata.values
        .some((item: MetadataInstance) => item.name
          .toLowerCase()
          .startsWith(filterValue.toLowerCase()))));
  }, []);

  const customGlobalFilter = useCallback((
    rows: Array<Row>, [index, ...colIds]: Array<string>, { filter, value }: TableGlobalFilter
  ) => {
    // return all rows if value is empty
    if (value === '') {
      return rows;
    }
    switch (filter) {
      case 'all':
        return filterAll(rows, colIds, value);
      case 'meta':
        return filterMeta(rows, colIds, value);
      default:
        return filterAll(rows, colIds, value);
    }
  }, []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter
  } = useTable({
    columns,
    data,
    getRowId,
    globalFilter: customGlobalFilter,
    autoResetGlobalFilter: false
  },
  useGlobalFilter,
  (hooks) => {
    // push a column for the index
    hooks.visibleColumns.push((cols) => [
      {
        id: 'index',
        Header: 'N.',
        // eslint-disable-next-line react/prop-types
        Cell: ({ row, flatRows, ...rest }) => {
          return (
            // eslint-disable-next-line react/prop-types
            <div>{flatRows.indexOf(row) + 1}</div>
          );
        }
      },
      ...cols
    ]);
  });

  useEffect(() => {
    if (searchFilter) {
      setGlobalFilter(searchFilter);
    }
  }, [searchFilter]);

  return (
    // apply the table props
    <>
      <TableRoot {...getTableProps([getGlobalProps()])}>
        <TableHead>
          {// Loop over the header rows
            headerGroups.map((headerGroup) => (
              // Apply the header row props
              <TableRow {...headerGroup.getHeaderGroupProps([getGlobalProps()])}>
                {// Loop over the headers in each row
                  headerGroup.headers.map((column, index) => (
                    // Apply the header cell props
                    <TableHeaderCell {...column.getHeaderProps(
                      [getHeaderProps(column), getGlobalProps(), { index }]
                    )}
                    >
                      {// Render the header
                        column.render('Header')
                      }
                    </TableHeaderCell>
                  ))}
              </TableRow>
            ))}
        </TableHead>
        {/* Apply the table body props */}
        <tbody {...getTableBodyProps()}>
          {// Loop over the table rows
            rows.map((row) => {
              // Prepare the row for display
              prepareRow(row);
              return (
                // Apply the row props
                <TableRow {...row.getRowProps(getGlobalProps())}>
                  {// Loop over the rows cells
                    row.cells.map((cell) => (
                      // Apply the cell prop
                      <TableRowCell {...cell.getCellProps([
                        getCellProps(cell), getGlobalProps()
                      ]) as any}>
                        {// Render the cell contents
                          cell.render('Cell', { value: 'prova' })}
                      </TableRowCell>
                    ))}
                </TableRow>
              );
            })}
        </tbody>
      </TableRoot>
      <TableFooter rows={rows} />
    </>
  );
};

export default Table;
