import style from "./TableHeadCell.module.css";
import React from "react";
import {useDispatch} from "react-redux";
import {addContext, removeContext} from "../../../../Redux/action/openContext";
import {selectColumn, deselectColumn, deleteColumn} from "../../../../Redux/action/loadColumns";
import {selectContext, deleteContext} from "../../../../ContextItems/ContextItems";
const TableHeadCell = (props) => {
   

    const {col} = props;
    let clickRef = React.useRef(null);
    const dispatch = useDispatch();
    const dispatchContext = (context) => {
        dispatch(addContext(context));
    }
    const dispatchSelectCol = (colName) => {
        dispatch(selectColumn(colName))
    }
    const dispatchDeselectCol = (colName) => {
        dispatch(deselectColumn(colName))
    }
    const dispatchDeleteCol = (colName) => {
        dispatch(deleteColumn(colName))
    }
    const dispatchRemoveContext = () => {
        dispatch(removeContext());
    }


    const displayContextMenu = (e, col) =>{
        e.preventDefault();
        // let bounds = clickRef.current.getBoundingClientRect();
        let xPos = e.clientX // - bounds.left;
        let yPos = e.clientY // - bounds.top;
        const contextProps = {
            xPos,
            yPos,
            type: "headerContext",
            items: [
                selectContext(col, dispatchSelectCol, dispatchDeselectCol, dispatchRemoveContext),
                deleteContext(col, dispatchDeleteCol, dispatchRemoveContext),
            ]
        }
        dispatchContext(contextProps);
        
    }

    const handleRef = (r) => {
        clickRef.current = r;
    };



    return (
        <div className={`${style.headerCell}`} 
        ref={(r) => {handleRef(r)}} 
        onContextMenu={(e)=>{displayContextMenu(e, col)}}>
        <div className={style.statusCell}>
            {col.selected && 
                <div className={style.selectedIcon}>
                </div>
            }
            {
                col.new && 
                <div className={style.newIcon}>
                </div>
            }
        </div>
        <div className={style.accessorCell}>
            <p>
            {col.label}
            </p>
        </div>
        </div>
    )

}

export default TableHeadCell;