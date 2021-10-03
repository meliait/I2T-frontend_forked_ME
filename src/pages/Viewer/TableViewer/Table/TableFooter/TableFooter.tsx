import { Typography } from '@mui/material';
import Paginator, { PaginatorProps } from './Paginator';
import styles from './TableFooter.module.scss';

interface TableFooterProps {
  /**
   * Rows of the table.
   */
  rows: any[];
  columns: any[];
  paginatorProps: PaginatorProps;
}

/**
 * Table footer element.
 */
const TableFooter = ({
  rows,
  columns,
  paginatorProps
}: TableFooterProps) => (
  <div className={styles.TableFooter}>
    <Typography color="textSecondary" variant="body2">
      {`Total columns: ${columns.length}`}
    </Typography>
    <Typography color="textSecondary" variant="body2">
      {`Total rows: ${rows.length}`}
    </Typography>
    <Paginator {...paginatorProps} />
  </div>
);

export default TableFooter;
