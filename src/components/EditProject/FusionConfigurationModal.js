import {Button, List, ListItem, makeStyles, OutlinedInput} from '@material-ui/core';
import React, {useEffect, useState} from 'react';

const useStyles = makeStyles((theme) => ({
    root: {
        position: 'absolute',
        top: '100px',
        left: 'calc(50% - 200px)',
        width: '500px',
        height: '400px',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        justifyContent: 'space-between',
        fontSize: '20px',
    },
    portListDiv: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '40%',
        marginTop: '20px',
        fontSize: '12px',
    },
    optionalPortListDiv: {
        width: '40%',
        height: '100%',
        fontSize: '12px',
    },
    portAddRemoveButtonDiv: {
        width: '20%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    },
    portAddRemoveButton: {
        border: 'solid 1px #434343',
        height: '20px',
        margin: '10px',
    },
    mandatoryPortListDiv: {
        width: '40%',
        height: '100%',
        fontSize: '12px',
    },
    portBox: {
        width: '100%',
        height: '80%',
        border: 'solid 1px #434343',
    },
    thresholdDiv: {
        width: '100%',
        height: '20%',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column'
    },
    correlationDiv: {
        width: '100%',
        height: '20%',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column'
    },
    button: {
        
    },
    input: {
        fontSize: '12px',
        height: '40px',
    }
}))
const pattern = /^\d+$/;
const FusionConfigurationModal = (props) => {
    const classes = useStyles()
    const [mandatoryPortList, setMandatoryPortList] = useState([]);
    const [optionalPortList, setOptionalPortList] = useState([]);
    const [threshold, setThreshold] = useState(null);
    const [correlation, setCorrelation] = useState(null);
    const [selectedInOList, setSelectedInOList] = useState(null);
    const [selectedInMList, setSelectedInMList] = useState(null);

    const {fusionOperator, onConfirm, selectInputPort, inputPorts} = props
    useEffect(() => {
        if(fusionOperator) {
            if(fusionOperator.fusionRule) {
                setMandatoryPortList(fusionOperator.fusionRule.mandatory_ports)
                setOptionalPortList(fusionOperator.fusionRule.optional_ports)
                setThreshold(fusionOperator.fusionRule.threshold)
                setCorrelation(fusionOperator.fusionRule.correlation)
            }
            else if(inputPorts) {
                setOptionalPortList(inputPorts)
            }
        }
    }, [fusionOperator])
    const handleSelectOptionalPort = (port, index) => {
        setSelectedInOList(index)
        setSelectedInMList(null)
        selectInputPort(port)
    }    
    const handleSelectMandatoryPort = (port, index) => {
        setSelectedInOList(null)
        setSelectedInMList(index)
        selectInputPort(port)
    }
    const handleConfirm = () => {
        if(mandatoryPortList.length === 0) {
            alert('No manadatory port')
        }
        else if(optionalPortList.length < threshold) {
            alert('Optional port threshold is too big')
        }
        else if(correlation === null) {
            alert('No correlation constraint')
        }
        else {
            onConfirm(mandatoryPortList, optionalPortList, threshold, correlation)
        }
    }
    const moveRight = () => {
        if(selectedInOList === null) return
        const temp = mandatoryPortList.slice();
        const temp2 = optionalPortList.slice();
        const port = optionalPortList[selectedInOList]

        temp.push(port);
        temp2.splice(selectedInOList, 1)
        setMandatoryPortList(temp);
        setOptionalPortList(temp2);
        setSelectedInOList(null);
        setSelectedInMList(temp.length - 1);
    }
    const moveLeft = () => {
        if(selectedInMList === null) return
        const temp = optionalPortList.slice();
        const temp2 = mandatoryPortList.slice();
        const port = mandatoryPortList[selectedInMList]
        
        temp.push(port);
        temp2.splice(selectedInMList, 1)
        setOptionalPortList(temp);
        setMandatoryPortList(temp2);
        setSelectedInMList(null);
        setSelectedInOList(temp.length - 1);
    }
    return (
        <div className={classes.root}>
            Fusion Rule Configuration
            <div className={classes.portListDiv}>
                <div className={classes.optionalPortListDiv}>
                Optional Ports
                    <div className={classes.portBox} onClick={(e) => {setSelectedInOList(null); e.stopPropagation()}}>
                        <List>
                            {optionalPortList.map((item, index) => {
                                return (
                                <ListItem 
                                selected={index===selectedInOList}
                                key={index} onClick={(e) => {handleSelectOptionalPort(item, index); e.stopPropagation()}}>
                                    {item.key}
                                </ListItem>
                                )
                            })}
                        </List>
                    </div>
                </div>
                <div className={classes.portAddRemoveButtonDiv}>
                    <Button className={classes.portAddRemoveButton} onClick={moveRight}>
                        {'>>'}
                    </Button>
                    <Button className={classes.portAddRemoveButton} onClick={moveLeft}>
                        {'<<'}
                    </Button>
                </div>
                <div className={classes.mandatoryPortListDiv}>
                Mandatory Ports
                    <div className={classes.portBox} onClick={(e) => {setSelectedInMList(null); e.stopPropagation()}}>
                        <List>
                            {mandatoryPortList.map((item, index) => {
                                return (
                                <ListItem 
                                selected={index===selectedInMList}
                                key={index} onClick={(e) => {handleSelectMandatoryPort(item, index); e.stopPropagation()}}>
                                    {item.key}
                                </ListItem>
                                )
                            })}
                        </List>
                    </div>
                </div>
            </div>
            <div className={classes.thresholdDiv}>
                Optional Ports Threshold
                <OutlinedInput
                className={classes.input}
                placeholder="A threshold on the number of optional ports"
                value={threshold}
                onChange={(e) => {
                    if(pattern.test(e.target.value)) {
                        setThreshold(e.target.value)
                    }
                    else if(e.target.value === "") {
                        setThreshold(null)
                    }
                    else {
                        e.target.value = threshold
                    } 
                }}
                />
            </div>
            
            <div className={classes.correlationDiv}>
                Correlation (ms)
                <OutlinedInput
                className={classes.input}
                placeholder="A correlation constraint"
                value={correlation}
                onChange={(e) => {
                    if(pattern.test(e.target.value)) {
                        setCorrelation(e.target.value)
                    }
                    else if(e.target.value === "") {
                        setCorrelation(null)
                    }
                    else {
                        e.target.value = correlation
                    } 
                }}
                />
            </div>
            <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={handleConfirm}>
                Confirm
            </Button>
        </div>
    );
};

export default FusionConfigurationModal;