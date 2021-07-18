import style from "./ExtendModal.module.scss";
import { Dropdown, Form, Modal } from "react-bootstrap";
import React from "react";
import { classicModalPropsInterface } from "../../Interfaces/classic-modal-props.interface";
import { useSelector } from "react-redux";
import MainButton from "../MainButton/MainButton";
import SecondaryButton from "../SecondaryButton/SecondaryButton";
import { RootState } from "../../Redux/store";
import DropdownMenu from "react-bootstrap/esm/DropdownMenu";
import { configInterface, extensionServiceInterface, inputModeEnum, selectColModeEnum } from "../../Interfaces/configInterface";
import { ConfirmationNumberTwoTone } from "@material-ui/icons";
import { copyFile } from "fs/promises";
import { colInterface } from "../../Interfaces/col.interface";

const ExtendModal = (props: classicModalPropsInterface) => {
    const { titleText, text, mainButtonLabel, mainButtonAction, secondaryButtonLabel, secondaryButtonAction, showState, onClose } = props;
    const [show, setShow] = React.useState(true);
    const Config = useSelector((state: RootState) => state.Config);
    const Data = useSelector((state: RootState) => state.Data);
    const [extendService, setExtendService] = React.useState<extensionServiceInterface | null>(null);
    const [paramsToSend, setParamsToSend] = React.useState<any>({});
    const Columns = useSelector((state: RootState) => state.Columns);
    const [paramError, setParamError] = React.useState<string | null>(null);
    const [matchingCols, setMatchingCols] = React.useState<{ colname: string, selectColMode: selectColModeEnum, matchinParam: string }[]>([])
    const [selectedCol, setSelectedCol] = React.useState<colInterface[]>(Columns.filter((col) => {
        return col.selected;
    }));

    React.useEffect(() => {
        setShow(showState);
    }, [showState])

    React.useEffect(() => {
        if (show === false) {
            onClose();
        }
    }, [show])


    const dropServiceItems = Config!.extensionServices.map((service) => {
        return (
            <Dropdown.Item key={service.name} onClick={() => { setExtendService(service) }}>{service.name}</Dropdown.Item>
        )
    })

    const requiredInput = () => {
        const myMarkup: any[] = [];
        for (const param of extendService!.requiredParams) {
            switch (param.inputMode) {
                case inputModeEnum.SELECT_COL:
                    if (param.default) {
                        const newPar = { ...paramsToSend };
                        newPar[param.name] = [param.default]
                        setParamsToSend(newPar);
                    }
                    myMarkup.push(
                        <div className={style.fieldContainer} key={param.name}>
                            <Form.Group>
                                <Form.Label>
                                    {param.name}
                                </Form.Label>
                                <Form.Control as="select" onChange={(e) => {
                                    const arrayValues2 = [];
                                    const targetColName = e.target.value;
                                    const newMatchingCols = matchingCols.filter((col) => {
                                        return col.colname !== targetColName;
                                    });
                                    setMatchingCols([...newMatchingCols, { colname: targetColName, selectColMode: param.selectColMode!, matchinParam: param.name }]);
                                    if (param.selectColMode === selectColModeEnum.IDS){
                                        for (const row of Data) {
                                            for (const meta of row[targetColName].metadata) {
                                                if (meta.match) {
                                                    arrayValues2.push(meta.id);
                                                    continue;
                                                }
                                            }
                                        }
                                    } else if (param.selectColMode === selectColModeEnum.LABELS) {
                                        for (const row of Data) {
                                            if (row[targetColName]) {
                                                arrayValues2.push(row[targetColName].label)
                                            }
                                        }
                                    }
                                    const newParams2 = { ...paramsToSend };
                                    newParams2[param.name] = arrayValues2;
                                    setParamsToSend(JSON.parse(JSON.stringify(newParams2)));
                                }}>
                                    <option selected disabled hidden>Selezionare una colonna per {param.name}</option>
                                    {selectedCol.map((col) => {
                                        return (
                                            <option value={col.name} key={col.name}>
                                                {col.name}
                                            </option>
                                        )
                                    })}
                                </Form.Control>
                                <p>Valori selezionati: {paramsToSend[param.name] ? paramsToSend[param.name].length : 0}</p>
                            </Form.Group>
                        </div >

                    )
                    break;
                case inputModeEnum.ENUMERATION:
                    if (param.default) {
                        const newPar = { ...paramsToSend };
                        newPar[param.name] = [param.default];
                        setParamsToSend(newPar);
                    }
                    myMarkup.push(
                        <div className={style.fieldContainer} key={param.name}>
                            {param.values!.map((value, index) => {
                                return (
                                    <div key={value.label}>
                                        <Form.Check
                                            type="checkbox"
                                            label={value.label}
                                            key={value.value}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const myPar = (paramsToSend[param.name] !== undefined) ? [...paramsToSend[param.name]] : [];
                                                    myPar.push(value.value)
                                                    const newPar = { ...paramsToSend };
                                                    newPar[param.name] = myPar;
                                                    setParamsToSend(newPar);
                                                } else {
                                                    const myPar = [...paramsToSend[param.name]];
                                                    let popIndex: number;
                                                    for (let z = 0; z < myPar.length; z++) {
                                                        if (myPar[z] === value.value) {
                                                            popIndex = z;
                                                        }
                                                    }
                                                    const myNewPar = [...myPar.slice(0, popIndex!), ...myPar.slice(popIndex! + 1)];
                                                    const newPar = { ...paramsToSend };
                                                    newPar[param.name] = myNewPar;
                                                    setParamsToSend(newPar);
                                                }
                                            }}
                                        />

                                    </div>
                                )
                            })}
                        </div>
                    )
                    break;
                case inputModeEnum.NUMBER:
                    if (param.default) {
                        const newPar = { ...paramsToSend };
                        newPar[param.name] = [param.default]
                        console.log(newPar);
                        setParamsToSend(newPar);
                    }
                    myMarkup.push(
                        <div className={style.fieldContainer} key={param.name}>
                            <Form.Group>
                                <Form.Label>{param.name}</Form.Label>
                                <Form.Control type="number" placeholder={`Enter ${param.name}`} value={param.default} onChange={(e) => {
                                    const newPar = { ...paramsToSend };
                                    newPar[param.name] = [e.target.value]
                                    setParamsToSend(newPar);
                                }} />
                            </Form.Group>
                        </div>
                    )
                    break;
                default:
                    continue;
            }
        }
        return myMarkup;
    }

    function checkIfAllParAreProvided(): boolean {
        let paramsAreProvided = true;
        for (const param of extendService!.requiredParams) {
            if (param.required) {
                if (paramsToSend[param.name]) {
                    if (param.inputMode === inputModeEnum.ENUMERATION) {
                        if (paramsToSend[param.name].length < 1) {
                            setParamError(`Il campo ${param.name} è necessario`);
                            paramsAreProvided = false;
                        }
                    }
                } else {
                    setParamError(`Il campo ${param.name} è necessario`)
                    paramsAreProvided = false;
                }
            }
        }
        if (paramsAreProvided) {
            setParamError(null);
        }
        return paramsAreProvided;
    }

    //togliere colonna selezionata dalla label

    return (
        <>
            <>
                <Modal show={show} onHide={() => { setShow(false) }} className={props.metadataModal ? style.metadataModal : undefined}>
                    <Modal.Header closeButton>
                        <Modal.Title>{titleText}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {text}

                        <Dropdown className={style.dropdown}>
                            <Dropdown.Toggle variant="primary" id="dropdown-basic">
                                {extendService ? extendService!.name : 'Scegli un servizio'}
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                                {dropServiceItems}
                            </Dropdown.Menu>
                            <Form>
                                {extendService && requiredInput()}
                            </Form>
                            {
                                paramError &&
                                <p className={style.paramError}>{paramError}</p>
                            }
                        </Dropdown>
                    </Modal.Body>
                    <Modal.Footer>
                        {
                            secondaryButtonLabel && secondaryButtonAction &&
                            <SecondaryButton
                                cta={secondaryButtonAction}
                                label={secondaryButtonLabel} />

                        }
                        {
                            mainButtonLabel && mainButtonAction &&
                            <MainButton cta={() => {
                                if (checkIfAllParAreProvided()) {
                                    mainButtonAction(paramsToSend, extendService?.relativeUrl, extendService, matchingCols)
                                }
                            }} label={mainButtonLabel} />
                        }


                    </Modal.Footer>
                </Modal>

            </>
        </>
    )
}

export default ExtendModal;