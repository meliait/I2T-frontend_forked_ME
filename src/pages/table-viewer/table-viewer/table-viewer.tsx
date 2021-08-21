import { useParams } from 'react-router-dom';
import {
  useMemo, useCallback,
  MouseEvent, useEffect,
  useState
} from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/store';
import { Menu, MenuItem } from '@material-ui/core';
import { getTable } from '@store/table/table.thunk';
import {
  selectCellMetadata,
  selectDataTableFormat, selectSelectedCells,
  selectSelectedColumns, updateCellSelection,
  updateColumnSelection
} from '@store/table/table.slice';
import { ID } from '@store/table/interfaces/table';
import { Table } from '../table';
import Toolbar from '../toolbar/toolbar';
import styles from './table-viewer.module.scss';

interface MenuState {
  mouseX: number | null;
  mouseY: number | null;
  target: {
    id: string;
    type: 'cell' | 'column';
  } | null;
}

// contextual close state
const contextualMenuCloseState: MenuState = {
  mouseX: null,
  mouseY: null,
  target: null
};

const TableViewer = () => {
  const dispatch = useAppDispatch();
  const [menuPosition, setMenu] = useState(contextualMenuCloseState);
  const { name } = useParams<{ name: string }>();
  const { columns, rows } = useAppSelector(selectDataTableFormat);

  const selectedColumns = useAppSelector(selectSelectedColumns);
  const selectedCells = useAppSelector(selectSelectedCells);
  const selectedCellMetadata = useAppSelector(selectCellMetadata);

  useEffect(() => {
    dispatch(getTable({ dataSource: 'tables', name }));
  }, [name]);

  const handleSelectedCellChange = (event: MouseEvent, id: ID) => {
    if (event.ctrlKey) {
      dispatch(updateCellSelection({ id, multi: true }));
    } else {
      dispatch(updateCellSelection({ id }));
    }
  };

  const handleCellRightClick = (
    event: MouseEvent<HTMLDivElement>,
    cellType: 'cell' | 'column', id: string
  ) => {
    event.preventDefault();
    handleSelectedCellChange(event, id);
    setMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      target: {
        id,
        type: cellType
      }
    });
  };

  const handleMenuClose = () => {
    setMenu(contextualMenuCloseState);
  };

  const handleSelectedColumnChange = useCallback((id: ID) => {
    dispatch(updateColumnSelection(id));
  }, []);

  const updateTableData = (rowIndex: number, columnId: string, value: string) => {
    // dispatch(updateData({ rowIndex, columnId, value }));
  };

  const columnsTable = useMemo(() => columns, [columns]);
  const rowsTable = useMemo(() => rows, [rows]);

  return (
    <>
      <Toolbar />
      <div className={styles.TableContainer}>
        <Table
          data={rowsTable}
          columns={columnsTable}
          getHeaderProps={({ id, reconciliator }) => ({
            id,
            reconciliator,
            selected: !!selectedColumns[id],
            handleCellRightClick,
            handleSelectedColumnChange
          })}
          getCellProps={({ column, row, value }) => {
            let selected = false;
            let matching = false;
            if (column.id !== 'index') {
              selected = !!selectedColumns[column.id] || selectedCells[`${value.rowId}$${column.id}`];
              matching = !!selectedCellMetadata[`${value.rowId}$${column.id}`];
            }
            return {
              column,
              row,
              value,
              selected,
              matching,
              // selectedCell,
              // selectedColumnsIds,
              // selectedMetadatasCells,
              handleSelectedCellChange,
              handleCellRightClick
            };
          }}
          updateTableData={updateTableData}
        />
        <Menu
          open={menuPosition.mouseY !== null}
          onClose={handleMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={
            menuPosition.mouseY !== null && menuPosition.mouseX !== null
              ? { top: menuPosition.mouseY, left: menuPosition.mouseX }
              : undefined
          }
        >
          <MenuItem>Copy</MenuItem>
          <MenuItem>Print</MenuItem>
          <MenuItem>Highlight</MenuItem>
          <MenuItem>Email</MenuItem>
        </Menu>
      </div>
    </>
  );
};

export default TableViewer;
