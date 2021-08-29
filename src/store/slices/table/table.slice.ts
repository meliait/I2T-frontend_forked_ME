import { PayloadAction } from '@reduxjs/toolkit';
import { convertFromCSV } from '@services/converters/csv-converter';
import { createSliceWithRequests } from '@store/enhancers/requests';
import { applyRedoPatches, applyUndoPatches, produceWithPatch } from '@store/enhancers/undo';
import { Payload } from '@store/interfaces/store';
import {
  AutoMatchingPayload,
  ReconciliationFulfilledPayload,
  SetDataPayload,
  TableState,
  TableUIState,
  UpdateCellEditablePayload,
  UpdateCellLabelPayload,
  UpdateCellMetadataPayload,
  UpdateSelectedCellsPayload,
  UpdateSelectedColumnPayload,
  UpdateSelectedRowPayload
} from './interfaces/table';
import { getTable, reconcile } from './table.thunk';
import { deleteOneColumn } from './utils/table.delete-utils';
import { isColumnReconciliated, setMatchingMetadata } from './utils/table.reconciliation-utils';
import {
  selectOneCell,
  selectOneRow,
  toggleCellSelection,
  toggleColumnSelection,
  toggleRowSelection
} from './utils/table.selection-utils';
import { removeObject, getIdsFromCell } from './utils/table.utils';

const initialState: TableState = {
  entities: {
    columns: { byId: {}, allIds: [] },
    rows: { byId: {}, allIds: [] }
  },
  ui: {
    openReconciliateDialog: false,
    openMetadataDialog: false,
    selectedColumnsIds: {},
    selectedRowsIds: {},
    selectedCellIds: {},
    selectedCellMetadataId: {}
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
        draft.ui.selectedCellMetadataId[cellId] = metadataId;
        draft.entities.rows.byId[rowId].cells[colId].metadata.values.forEach((metaItem) => {
          if (metaItem.id === metadataId) {
            metaItem.match = true;
          } else {
            metaItem.match = false;
          }
        });
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
        const { selectedCellIds, selectedCellMetadataId } = draft.ui;
        Object.keys(selectedCellIds).forEach((cellId) => {
          const [rowId, colId] = getIdsFromCell(cellId);
          const cell = rows.byId[rowId].cells[colId];
          setMatchingMetadata(cell, cellId, threshold, selectedCellMetadataId);
        });
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
     * Delete selected columns.
     * --UNDOABLE ACTION--
     */
    deleteColumn: (state, action: PayloadAction<Payload>) => {
      const { undoable } = action.payload;
      const { selectedColumnsIds } = state.ui;
      let { columns, rows } = state.entities;

      return produceWithPatch(state, !!undoable, (draft) => {
        Object.keys(selectedColumnsIds).forEach((colId) => {
          const { newColumns, newRows } = deleteOneColumn(columns, rows, colId);
          columns = newColumns;
          rows = newRows;
        });
        draft.entities.columns = columns;
        draft.entities.rows = rows;
      }, (draft) => {
        // also remove selection from deleted columns without generating patches
        draft.ui.selectedColumnsIds = {};
        // TODO: check more specifically on which cells to delete
        draft.ui.selectedCellIds = {};
      });
    },
    /**
     * Perform an undo by applying undo patches (past patches).
     */
    undo: (state, action: PayloadAction<void>) => {
      return applyUndoPatches(state);
    },
    /**
     * Perform a redo by applying redo patches (future patches).
     */
    redo: (state, action: PayloadAction<void>) => {
      return applyRedoPatches(state);
    }
  },
  extraRules: (builder) => (
    builder
      // set table on request fulfilled
      .addCase(getTable.fulfilled, (state, { payload }: PayloadAction<Payload<SetDataPayload>>) => {
        const { data, format } = payload;
        if (format === 'csv') {
          const entities = convertFromCSV(data);
          state.entities = entities;
        }
        return state;
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
          // add metadata to cells
          data.forEach((item) => {
            draft.ui.selectedCellMetadataId = removeObject(
              draft.ui.selectedCellMetadataId, item.id
            );
            const [rowId, colId] = getIdsFromCell(item.id);
            updatedColumns.add(colId);
            draft.entities.rows.byId[rowId].cells[colId].metadata.reconciliator = reconciliator;
            draft.entities.rows.byId[rowId].cells[colId].metadata.values = item.metadata;
          });
          updatedColumns.forEach((colId) => {
            if (isColumnReconciliated(draft, colId)) {
              if (draft.entities.columns.byId[colId].reconciliator !== reconciliator) {
                draft.entities.columns.byId[colId].reconciliator = reconciliator;
              }
            } else {
              draft.entities.columns.byId[colId].reconciliator = '';
            }
          });
        });
      })
  )
});

export const {
  updateCellEditable,
  updateCellLabel,
  updateCellMetadata,
  autoMatching,
  updateColumnSelection,
  updateRowSelection,
  updateCellSelection,
  updateUI,
  deleteColumn,
  undo,
  redo
} = tableSlice.actions;

export default tableSlice.reducer;
