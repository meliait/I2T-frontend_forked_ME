import {
  useMemo, useCallback,
  MouseEvent, useEffect,
  useState
} from 'react';
import {
  redo,
  undo, updateCellLabel, updateCellSelection,
  updateColumnSelection,
  updateRowSelection
} from '@store/slices/table/table.slice';
import { useAppDispatch, useAppSelector } from '@hooks/store';
import { LinearProgress } from '@material-ui/core';
import { HotKeys } from 'react-hotkeys';
import {
  selectDataTableFormat,
  selectSelectedColumnIds, selectSelectedRowIds,
  selectSelectedCellIds,
  selectIsDenseView, selectSearchStatus,
  selectGetTableStatus, selectIsUnsaved, selectIsHeaderExpanded
} from '@store/slices/table/table.selectors';
import { useHistory, useParams } from 'react-router-dom';
import { getTable, saveTable } from '@store/slices/table/table.thunk';
import { ID } from '@store/interfaces/store';
import { RouteLeaveGuard } from '@components/kit';
import { selectReconciliatorsAsObject } from '@store/slices/config/config.selectors';
import clsx from 'clsx';
import { Table } from '../Table';
import Toolbar from '../Toolbar';
import styles from './TableViewer.module.scss';
import { TableCell, TableColumn } from '../Table/interfaces/table';
import { ContextMenuCell, ContextMenuColumn, ContextMenuRow } from '../Menus/ContextMenus';

interface MenuState {
  status: Record<string, boolean>
  data: any | undefined;
}

const initialMenuState: MenuState = {
  status: {
    cell: false,
    row: false,
    column: false
  },
  data: {}
};

const keyMap = {
  SAVE: 'ctrl+s',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+shift+z'
};

const TableViewer = () => {
  const dispatch = useAppDispatch();
  const { id: tableId } = useParams<{ id: ID }>();
  const [menuState, setMenuState] = useState(initialMenuState);
  const [anchorEl, setAnchorEl] = useState<null | any>(null);
  const history = useHistory();
  const { columns, rows } = useAppSelector(selectDataTableFormat);
  const { loading } = useAppSelector(selectGetTableStatus);
  const unsavedChanges = useAppSelector(selectIsUnsaved);
  const searchFilter = useAppSelector(selectSearchStatus);
  const selectedColumns = useAppSelector(selectSelectedColumnIds);
  const selectedRows = useAppSelector(selectSelectedRowIds);
  const selectedCells = useAppSelector(selectSelectedCellIds);
  const isDenseView = useAppSelector(selectIsDenseView);
  const isHeaderExpanded = useAppSelector(selectIsHeaderExpanded);
  const allReconciliators = useAppSelector(selectReconciliatorsAsObject);

  useEffect(() => {
    if (tableId) {
      dispatch(getTable(tableId));
    }
  }, [tableId]);

  /**
 * Keyboard shortcut handlers
 */
  const saveWork = useCallback((event: KeyboardEvent | undefined) => {
    if (event) {
      event.preventDefault();
      if (unsavedChanges) {
        dispatch(saveTable())
          .unwrap()
          .then((res) => {
            history.push(res.id);
          });
      }
    }
    // Saving
  }, []);
  const undoOperation = useCallback(() => {
    dispatch(undo());
  }, []);
  const redoOperation = useCallback(() => {
    dispatch(redo());
  }, []);

  const keyHandlers = {
    SAVE: saveWork,
    UNDO: undoOperation,
    REDO: redoOperation
  };

  /**
   * Handle selection of a cell.
   */
  const handleSelectedCellChange = useCallback((event: MouseEvent, id: ID) => {
    if (event.ctrlKey) {
      dispatch(updateCellSelection({ id, multi: true }));
    } else {
      dispatch(updateCellSelection({ id }));
    }
  }, []);

  const handleSelectedRowChange = useCallback((event: MouseEvent, id: ID) => {
    if (event.ctrlKey) {
      dispatch(updateRowSelection({ id, multi: true }));
    } else {
      dispatch(updateRowSelection({ id }));
    }
  }, []);

  /**
   * Handle selection of a column.
   */
  const handleSelectedColumnChange = useCallback((event: MouseEvent, id: ID) => {
    if (event.ctrlKey) {
      dispatch(updateColumnSelection({ id, multi: true }));
    } else {
      dispatch(updateColumnSelection({ id }));
    }
  }, []);

  /**
   * Handle update of cell values.
   */
  const updateTableData = useCallback((cellId: ID, value: string) => {
    dispatch(updateCellLabel({ cellId, value }));
  }, []);

  /**
   * Generate getBoundingClientRect function.
   */
  const generateGetBoundingClientRect = useCallback((x: number, y: number) => {
    return () => ({
      width: 0,
      height: 0,
      top: y,
      right: x,
      bottom: y,
      left: x
    });
  }, []);

  /**
   * Handle cell / column right click.
   */
  const handleCellRightClick = useCallback((e: MouseEvent<HTMLElement>, type: 'cell' | 'column' | 'row' | null, id: string) => {
    e.preventDefault();
    if (type === 'cell') {
      dispatch(updateCellSelection({ id }));
    } else if (type === 'row') {
      dispatch(updateRowSelection({ id }));
    } else {
      dispatch(updateColumnSelection({ id }));
    }

    const status = Object.keys(menuState.status).reduce((acc, key) => ({
      ...acc,
      [key]: key === type
    }), {});
    const data = { id };
    setMenuState({ status, data });

    // create a virtual anchor element for the menu
    const { clientX, clientY } = e;
    const virtualElement = {
      clientWidth: clientX,
      clientHeight: clientY,
      getBoundingClientRect: generateGetBoundingClientRect(clientX, clientY)
    };
    setAnchorEl(virtualElement);
  }, []);

  /**
   * Close contextual menu.
   */
  const handleMenuClose = useCallback(() => {
    setMenuState(initialMenuState);
  }, []);

  /**
   * Properties to pass to each header.
   */
  const getHeaderProps = useCallback(({
    id,
    data,
    ...colTableProps
  }: TableColumn) => {
    return {
      id,
      selected: !!selectedColumns[id],
      data,
      handleCellRightClick,
      handleSelectedColumnChange
    };
  }, [selectedColumns, allReconciliators]);

  /**
   * Properties to pass to each cell.
   */
  const getCellProps = useCallback(({
    column, row, value, ...props
  }: TableCell) => {
    const selected = !!selectedCells[`${row.id}$${column.id}`] || !!selectedRows[row.id];
    return {
      column,
      row,
      value,
      selected,
      handleSelectedRowChange,
      handleSelectedCellChange,
      handleCellRightClick,
      updateTableData
    };
  }, [
    selectedCells,
    selectedRows
  ]);

  const getGlobalProps = useCallback(() => ({
    dense: isDenseView
  }), [isDenseView]);

  const columnsTable = useMemo(() => columns, [columns]);
  const rowsTable = useMemo(() => rows, [rows]);
  const searchFilterTable = useMemo(() => searchFilter, [searchFilter]);

  return (
    <HotKeys className={styles.HotKeysContainer} keyMap={keyMap} handlers={keyHandlers}>
      <Toolbar />
      <div className={clsx(
        styles.TableContainer,
        {
          [styles.HeaderExpanded]: isHeaderExpanded
        }
      )}>
        {!loading ? (
          <Table
            data={rowsTable}
            columns={columnsTable}
            searchFilter={searchFilterTable}
            headerExpanded={isHeaderExpanded}
            getGlobalProps={getGlobalProps}
            // getFirstHeaderProps={getFirstHeaderProps}
            getHeaderProps={getHeaderProps}
            getCellProps={getCellProps}
          />
        ) : <LinearProgress />
        }
        <ContextMenuCell
          open={menuState.status.cell}
          anchorElement={anchorEl}
          handleClose={handleMenuClose}
          data={menuState.data}
        />
        <ContextMenuColumn
          open={menuState.status.column}
          anchorElement={anchorEl}
          handleClose={handleMenuClose}
          data={menuState.data}
        />
        <ContextMenuRow
          open={menuState.status.row}
          anchorElement={anchorEl}
          handleClose={handleMenuClose}
        />
      </div>
      <RouteLeaveGuard
        when={unsavedChanges}
        navigate={(path) => history.push(path)}
        shouldBlockNavigation={(location) => {
          if (unsavedChanges) {
            return true;
          }
          return false;
        }}
      />
    </HotKeys>
  );
};

export default TableViewer;
