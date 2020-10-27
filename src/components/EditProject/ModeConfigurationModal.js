import {Button, FormControl, FormControlLabel, IconButton, Input, InputLabel, List, ListItem, makeStyles, MenuItem, NativeSelect, OutlinedInput, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField} from '@material-ui/core';
import React, {useEffect, useState} from 'react';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import Checkbox from '@material-ui/core/Checkbox';
const useStyles = makeStyles((theme) => ({
    root: {
        position: 'absolute',
        top: '100px',
        left: 'calc(50% - 200px)',
        width: '500px',
        height: '600px',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        justifyContent: 'space-between',
        fontSize: '20px',
    },
    eventListDiv: {
        width: '100%',
        height: '200px',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'start',
    },
    modeTableDiv: {
        width: '100%', 
        height: '300px',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'start',
    },
    modeTableBody: {
        height: '200px',
        overflow: 'scroll',
    },
    formDiv: {
        width: '100%',
        height: '25px',
        display: 'flex',
        flexDirection: 'row',
    },
    input: {
        width: '80%'
    },
    buttonAdd: {
        width: '20%',
        textTransform: 'none',
    },
    eventList: {
        width: '100%',
        height: '100%',
        border: 'solid 1px #434343',
        marginTop: '10px',
        paddingTop: '3px',
        paddingBottom: '3px',
    },
    listItem: {
        width: '100%',
        fontSize: '15px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: '1px',
        paddingBottom: '1px',
        height: '25px',
    },
    button: {
        textTransform: 'none',
    },
    modeTable: {
        width: '100%',
        height: '250px',
        marginTop: '10px',
        border: 'solid 1px #434343',
    },
    header: {
        height: '50px',
    },
    col1: {
        width: '110px',
        textAlign: 'center',
        padding: '0px',
    },
    col2: {
        width: '25px',
        textAlign: 'center',
        padding: '0px',
    },
    col3: {
        width: '110px',
        textAlign: 'center',
        padding: '0px',
    },
    col4: {
        width: '110px',
        textAlign: 'center',
        padding: '0px',
    },
    col5: {
        width: '120px',
        textAlign: 'center',
        padding: '0px',
    },
    col6: {
        width: '25px',
        textAlign: 'center',
        padding: '0px',
    }
}));
const EventSelect = (props) => {
    const [nextMode, setNextMode] = useState(null);
    const [mode, setMode] = useState(null);
    const handleChange = (e) => {
        setNextMode(e.target.value)
        props.event.next_mode = e.target.value;
    }
    useEffect(() => {
        if(props.event && props.mode && mode === null) {
            setMode(props.mode)
            setNextMode(props.event.next_mode)
        }
    }, [props])
    return ( 
    <Select fullWidth value={nextMode} onChange={handleChange} disableUnderline>
        {props.modeList.map(mode => {
            return <MenuItem value={mode.name}>{mode.name}</MenuItem>
        })}
    </Select>
    )
    
}
const pattern = /[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"\s]/;

const ModeConfigurationModal = (props) => {
    const classes = useStyles();
    const [eventList, setEventList] = useState([]);
    const [modeList, setModeList] = useState([]);
    const [newEvent, setNewEvent] = useState('');
    const [newMode, setNewMode] = useState('');
    const {factory} = props
    useEffect(() => {
        if(factory) {
            const set_event = new Set();
            factory.mode_configuration.mode_list.forEach(function(mode) {
                mode.events.forEach((event) => {
                    set_event.add(event);
                })
                setEventList(Array.from(set_event));
                
            })
            setModeList(factory.mode_configuration.mode_list.slice());
        } 
    }, [factory])
    const addEvent = () => {
        const new_list = eventList.slice()
        setEventList([]);
        new_list.push({name: newEvent})
        setEventList(new_list);
        modeList.map(mode => {
            mode.events.push({
                name: newEvent,
                next_mode: mode.name,
                output_internal_data_items: false,
            })
        })
        setNewEvent('');
    }
    const addMode = () => {
        const new_list = JSON.parse(JSON.stringify(modeList))
        setModeList([]);
        const data = {
            name: newMode,
            events: JSON.parse(JSON.stringify(eventList)),
        };
        data.events.map(event => {
            event.next_mode = newMode;
            event.output_internal_data_items = false;
        });
        new_list.push(data);
        // console.log(new_list)
        setModeList(new_list);
        setNewMode('');
    }
    const handleCheck = (mode, event) => {
        event.output_internal_data_items = !event.output_internal_data_items;
        const new_modeList = modeList.slice();
        setModeList([]);
        setModeList(new_modeList);
    }
    return (
        <div className={classes.root}>
            Mode Configuration
            <div className={classes.eventListDiv}>
                Event List
                <List className={classes.eventList}>
                    {eventList.map((item, index) => {
                        return (
                            <ListItem key={index} className={classes.listItem}>
                                {item.name}
                                <div>
                                    <IconButton>
                                        <EditIcon size='small'/>
                                    </IconButton>
                                    <IconButton>
                                        <DeleteIcon size='small'/>
                                    </IconButton>
                                </div>
                                
                            </ListItem>
                        )
                    })}
                </List>
                <div className={classes.formDiv}>
                    <OutlinedInput 
                    className={classes.input} 
                    placeholder="New event..." 
                    value={newEvent}
                    onChange = {e => {
                        if(!pattern.test(e.target.value)) {
                            setNewEvent(e.target.value)
                        }
                        else {
                            e.target.value = newEvent;
                        }
                    }}
                    />
                    <Button 
                    className={classes.buttonAdd} 
                    variant="contained" 
                    color="second"
                    onClick={addEvent}
                    >
                        Add
                    </Button>
                </div>
            </div>
            <div className={classes.modeTableDiv}>
                Mode Change Table
                <TableContainer className={classes.modeTable}>
                <Table stickyHeader>
                    <TableHead className={classes.header}>
                        <TableCell className={classes.col1}>
                            Mode
                        </TableCell>
                        <TableCell className={classes.col2}/>
                        <TableCell className={classes.col3}>
                            Event
                        </TableCell>
                        <TableCell className={classes.col4}>
                            Next mode
                        </TableCell>
                        <TableCell className={classes.col5}>
                            Output Internal Data Items
                        </TableCell>
                        <TableCell className={classes.col6}/>
                    </TableHead>
                    <TableBody className={classes.modeTableBody}>
                        {modeList.map((mode, index) => {
                            return mode.events.map((event, index2) => {
                                return (
                                    <TableRow key={index2}>
                                        <TableCell className={classes.col1}>
                                            {mode.name}
                                        </TableCell>
                                        <TableCell className={classes.col2}>
                                            <IconButton>
                                                <EditIcon size='small'/>
                                            </IconButton>
                                        </TableCell>
                                        <TableCell className={classes.col3}>
                                            {event.name}
                                        </TableCell>
                                        <TableCell className={classes.col4}>
                                            <EventSelect modeList={modeList} mode={mode} event={event}/>
                                        </TableCell>
                                        <TableCell className={classes.col5}>
                                            <Checkbox color="primary" onChange={() => handleCheck(mode, event)} checked={event.output_internal_data_items}/>
                                                                                        
                                        </TableCell>
                                        <TableCell className={classes.col6}>
                                            <IconButton>
                                                <DeleteIcon size='small'/>
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        })}
                    </TableBody>
                </Table>
                </TableContainer>
                
                <div className={classes.formDiv}>
                    <OutlinedInput 
                    className={classes.input} 
                    placeholder="New Mode..."
                    value={newMode}
                    onChange = {e => {
                        if(!pattern.test(e.target.value)) {
                            setNewMode(e.target.value)
                        }
                        else {
                            e.target.value = newMode;
                        }
                    }}
                    />
                    <Button 
                    className={classes.buttonAdd} 
                    variant="contained" 
                    color="second"
                    onClick={addMode}
                    >
                        Add
                    </Button>
                </div>
            </div>
            <Button 
            variant="contained" 
            color="primary" 
            className={classes.button} 
            onClick={() => props.onConfirm(modeList)}
            >
                Confirm
            </Button>
        </div>
    );
};

export default ModeConfigurationModal;