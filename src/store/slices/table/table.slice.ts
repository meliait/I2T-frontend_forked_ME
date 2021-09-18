import { PayloadAction } from '@reduxjs/toolkit';
import { GetTableResponse } from '@services/api/table';
import { convertFromCSV, CsvSeparator } from '@services/converters/csv-converter';
import { createSliceWithRequests } from '@store/enhancers/requests';
import { applyRedoPatches, applyUndoPatches, produceWithPatch } from '@store/enhancers/undo';
import { Payload } from '@store/interfaces/store';
import { TableInstance } from '../tables/interfaces/tables';
import {
  AutoMatchingPayload,
  ColumnStatus,
  DeleteColumnPayload,
  DeleteRowPayload,
  DeleteSelectedPayload,
  FileFormat,
  ReconciliationFulfilledPayload,
  TableState,
  TableType,
  TableUIState,
  UpdateCellEditablePayload,
  UpdateCellLabelPayload,
  UpdateCellMetadataPayload,
  UpdateCurrentTablePayload,
  UpdateSelectedCellsPayload,
  UpdateSelectedColumnPayload,
  UpdateSelectedRowPayload
} from './interfaces/table';
import {
  exportTable, getTable,
  reconcile, saveTable
} from './table.thunk';
import {
  deleteOneColumn, deleteOneRow,
  deleteSelectedColumns, deleteSelectedRows
} from './utils/table.delete-utils';
import { StandardTable } from './utils/table.export-utils';
import { isColumnReconciliated, setMatchingMetadata, hasColumnMetadata } from './utils/table.reconciliation-utils';
import {
  areOnlyRowsSelected,
  areRowsColumnsSelected,
  selectOneCell,
  selectOneRow,
  toggleCellSelection,
  toggleColumnSelection,
  toggleRowSelection
} from './utils/table.selection-utils';
import { getIdsFromCell } from './utils/table.utils';

const initialState: TableState = {
  entities: {
    tableInstance: { name: '' },
    columns: { byId: {}, allIds: [] },
    rows: { byId: {}, allIds: [] }
  },
  ui: {
    lastSaved: '',
    search: { filter: 'all', value: '' },
    denseView: false,
    openReconciliateDialog: false,
    openMetadataDialog: false,
    openExportDialog: false,
    selectedColumnsIds: {},
    selectedRowsIds: {},
    selectedCellIds: {}
  },
  _requests: { byId: {}, allIds: [] },
  _draft: {
    patches: [],
    inversePatches: [],
    undoPointer: -1,
    redoPointer: -1
  }
};

export const tableSlice = createSliceWithRequests({
  name: 'table',
  initialState,
  reducers: {
    restoreInitialState: (state, action: PayloadAction<void>) => {
      return { ...initialState };
    },
    /**
     * Update current table.
     */
    updateCurrentTable: (state, action: PayloadAction<Payload<UpdateCurrentTablePayload>>) => {
      state.entities.tableInstance = {
        ...state.entities.tableInstance,
        ...action.payload
      };
      state.entities.tableInstance.lastModifiedDate = new Date().toISOString();
    },
    /**
     *  Set selected cell as expanded.
     */
    updateSelectedCellExpanded: (state, action: PayloadAction<Payload>) => {
      const { undoable = false } = action.payload;
      Object.keys(state.ui.selectedCellIds).forEach((cellId) => {
        const [rowId, colId] = getIdsFromCell(cellId);
        state.entities.rows.byId[rowId].cells[colId].expanded = !state.entities.rows
          .byId[rowId].cells[colId].expanded;
      });
    },
    /**
     * Set cell editable.
     */
    updateCellEditable: (state, action: PayloadAction<Payload<UpdateCellEditablePayload>>) => {
      const { cellId } = action.payload;
      const [rowId, colId] = getIdsFromCell(cellId);
      state.entities.rows.byId[rowId].cells[colId].editable = true;
    },
    /**
     * Handle update of cell label.
     * --UNDOABLE ACTION--
     */
    updateCellLabel: (state, action: PayloadAction<Payload<UpdateCellLabelPayload>>) => {
      const { cellId, value, undoable = true } = action.payload;
      const [rowId, colId] = getIdsFromCell(cellId);

      if (state.entities.rows.byId[rowId].cells[colId].label !== value) {
        return produceWithPatch(state, undoable, (draft) => {
          draft.entities.rows.byId[rowId].cells[colId].label = value;
        }, (draft) => {
          // do not include in undo history
          draft.entities.rows.byId[rowId].cells[colId].editable = false;
          draft.entities.tableInstance.lastModifiedDate = new Date().toISOString();
        });
      }
      // if value is the same just stop editing cell
      state.entities.rows.byId[rowId].cells[colId].editable = false;
    },
    /**
     * Handle the assignment of a metadata to a cell.
     * --UNDOABLE ACTION--
     */
    updateCellMetadata: (state, action: PayloadAction<Payload<UpdateCellMetadataPayload>>) => {
      const { metadataId, cellId, undoable = true } = action.payload;
      const [rowId, colId] = getIdsFromCell(cellId);

      return produceWithPatch(state, undoable, (draft) => {
        // draft.ui.selectedCellMetadataId[cellId] = metadataId;
        draft.entities.rows.byId[rowId].cells[colId].metadata.values.forEach((metaItem) => {
          if (metaItem.id === metadataId) {
            metaItem.match = !metaItem.match;
          } else {
            metaItem.match = false;
          }
        });
        if (isColumnReconciliated(draft, colId)) {
          draft.entities.columns.byId[colId].status = ColumnStatus.RECONCILIATED;
        }
      }, (draft) => {
        // do not include in undo history
        draft.entities.tableInstance.lastModifiedDate = new Date().toISOString();
      });
    },
    /**
     * Handle auto matching operations.
     * It updates cell matching metadata based on threshold.
     * --UNDOABLE ACTION--
     */
    autoMatching: (state, action: PayloadAction<Payload<AutoMatchingPayload>>) => {
      const { threshold, undoable = true } = action.payload;

      return produceWithPatch(state, undoable, (draft) => {
        const { rows } = draft.entities;
        const { selectedCellIds } = draft.ui;
        Object.keys(selectedCellIds).forEach((cellId) => {
          const [rowId, colId] = getIdsFromCell(cellId);
          const cell = rows.byId[rowId].cells[colId];
          setMatchingMetadata(cell, threshold);
          if (isColumnReconciliated(draft, colId)) {
            draft.entities.columns.byId[colId].status = ColumnStatus.RECONCILIATED;
          }
        });
      }, (draft) => {
        // do not include in undo history
        draft.entities.tableInstance.lastModifiedDate = new Date().toISOString();
      });
    },
    /**
     * Handle changes to selected columns.
     */
    updateColumnSelection: (state, action: PayloadAction<UpdateSelectedColumnPayload>) => {
      const { id: colId, multi } = action.payload;
      toggleColumnSelection(state, colId);
    },
    /**
     * Handle changes to selected cells.
     */
    updateCellSelection: (state, action: PayloadAction<Payload<UpdateSelectedCellsPayload>>) => {
      const { id: cellId, multi } = action.payload;

      if (multi) {
        toggleCellSelection(state, cellId);
      } else {
        selectOneCell(state, cellId);
      }
    },
    /**
     * Handle changes to selected rows.
     */
    updateRowSelection: (state, action: PayloadAction<Payload<UpdateSelectedRowPayload>>) => {
      const { id: rowId, multi } = action.payload;

      if (multi) {
        toggleRowSelection(state, rowId);
      } else {
        selectOneRow(state, rowId);
      }
    },
    /**
     * Merges parameters of the UI to the current state.
     */
    updateUI: (state, action: PayloadAction<Payload<Partial<TableUIState>>>) => {
      const { undoable, ...rest } = action.payload;
      state.ui = { ...state.ui, ...rest };
    },
    /**
     * Delete selected columns and/or rows.
     * --UNDOABLE ACTION--
     */
    deleteSelected: (state, action: PayloadAction<Payload<DeleteSelectedPayload>>) => {
      const { undoable = true } = action.payload;
      return produceWithPatch(state, undoable, (draft) => {
        if (areRowsColumnsSelected(draft)) {
          if (areOnlyRowsSelected(draft)) {
            deleteSelectedRows(draft);
          } else {
            deleteSelectedColumns(draft);
            deleteSelectedRows(draft);
          }
        }
      }, (draft) => {
        // do not include in undo history
        draft.ui.selectedColumnsIds = {};
        draft.ui.selectedRowsIds = {};
        draft.ui.selectedCellIds = {};
        draft.entities.tableInstance.lastModifiedDate = new Date().toISOString();
      });
    },
    deleteColumn: (state, action: PayloadAction<Payload<DeleteColumnPayload>>) => {
      const { undoable = true, colId } = action.payload;
      return produceWithPatch(state, undoable, (draft) => {
        deleteOneColumn(draft, colId);
      }, (draft) => {
        draft.ui.selectedColumnsIds = {};
        draft.ui.selectedCellIds = {};
      });
    },
    deleteRow: (state, action: PayloadAction<Payload<DeleteRowPayload>>) => {
      const { undoable = true, rowId } = action.payload;
      return produceWithPatch(state, undoable, (draft) => {
        deleteOneRow(draft, rowId);
      }, (draft) => {
        draft.ui.selectedRowsIds = {};
        draft.ui.selectedCellIds = {};
      });
    },
    /**
     * Perform an undo by applying undo patches (past patches).
     */
    undo: (state, action: PayloadAction<void>) => {
      return applyUndoPatches(state, (draft) => {
        draft.entities.tableInstance.lastModifiedDate = new Date().toISOString();
      });
    },
    /**
     * Perform a redo by applying redo patches (future patches).
     */
    redo: (state, action: PayloadAction<void>) => {
      return applyRedoPatches(state, (draft) => {
        draft.entities.tableInstance.lastModifiedDate = new Date().toISOString();
      });
    }
  },
  extraRules: (builder) => (
    builder
      .addCase(getTable.fulfilled, (state, action: PayloadAction<GetTableResponse>) => {
        const { table, columns, rows } = action.payload;
        let tableInstance = {} as TableInstance;
        if (table.type === TableType.RAW) {
          tableInstance.name = 'Table name';
          tableInstance.format = FileFormat.JSON;
          tableInstance.type = TableType.ANNOTATED;
          tableInstance.lastModifiedDate = new Date().toISOString();
        } else {
          tableInstance = { ...table };
          state.ui.lastSaved = tableInstance.lastModifiedDate;
        }
        state.entities = {
          tableInstance,
          columns,
          rows
        };
      })
      .addCase(saveTable.fulfilled, (state, action: PayloadAction<TableInstance>) => {
        state.ui.lastSaved = action.payload.lastModifiedDate;
      })
      /**
       * Set metadata on request fulfilled.
       * --UNDOABLE ACTION--
       */
      .addCase(reconcile.fulfilled, (
        state, action: PayloadAction<Payload<ReconciliationFulfilledPayload>>
      ) => {
        const { data, reconciliator, undoable = true } = action.payload;

        return produceWithPatch(state, undoable, (draft) => {
          const updatedColumns = new Set<string>();
          const reconciliators = {} as Record<any, string[]>;
          // add metadata to cells
          data.forEach((item) => {
            const [rowId, colId] = getIdsFromCell(item.id);
            updatedColumns.add(colId);
            // keep track of reconciliators for each column
            if (!reconciliators[colId]) {
              reconciliators[colId] = [];
            }
            reconciliators[colId] = [
              ...reconciliators[colId],
              reconciliator.id
            ];
            draft.entities.rows.byId[rowId].cells[colId].metadata.reconciliator = {
              id: reconciliator.id,
              name: reconciliator.name
            };
            draft.entities.rows.byId[rowId].cells[colId].metadata.values = item.metadata;
          });
          updatedColumns.forEach((colId) => {
            draft.entities.columns.byId[colId].reconciliators = Array.from(
              new Set<string>(reconciliators[colId]
                .concat(draft.entities.columns.byId[colId].reconciliators))
            );
            if (hasColumnMetadata(draft, colId)) {
              draft.entities.columns.byId[colId].status = ColumnStatus.PENDING;
            }
          });
        }, (draft) => {
          draft.entities.tableInstance.lastModifiedDate = new Date().toISOString();
        });
      })
  )
});

export const {
  restoreInitialState,
  updateCurrentTable,
  updateSelectedCellExpanded,
  updateCellEditable,
  updateCellLabel,
  updateCellMetadata,
  autoMatching,
  updateColumnSelection,
  updateRowSelection,
  updateCellSelection,
  updateUI,
  deleteColumn,
  deleteRow,
  deleteSelected,
  undo,
  redo
} = tableSlice.actions;

export default tableSlice.reducer;
