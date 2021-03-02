import React, { useState, useEffect } from 'react';
import { makeStyles, Button, Select, MenuItem } from '@material-ui/core';
import MaterialTable from "material-table";
import { Input } from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import ClearIcon from "@material-ui/icons/Clear";
import CheckIcon from "@material-ui/icons/Check";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import message_pkgs from './message_pkgs';
import Header from '../Common/Header';

const useStyles = makeStyles((theme) => ({
    root: {
        position: 'absolute',
        top: '100px',
        left: 'calc(50% - 200px)',
        width: '500px',
        height: '500px',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        justifyContent: 'space-between',
        fontSize: '15px',
    },
    textField: {
    },
    select: {
    },
    buttonDiv: {
        display: 'flex',
        flexDirection: 'row',
        padding: '10px'
    },
    buttonDelete: {
        textTransform: 'none',
        marginRight: '10px',
        width: '50px',
    },
    button: {
        textTransform: 'none',
        width: '50px',
    },
    tableWrapper: {
        width: '100%',
        height: 'calc(100% - 56px)'
    }
}))
const primitive_types = [
    "bool", 
    "byte", 
    "char", 
    "float32", 
    "float64", 
    "int8", 
    "uint8", 
    "int16", 
    "uint16", 
    "int32", 
    "uint32", 
    "int64", 
    "uint64", 
    "string", 
    "wstring",
    "bool[]", 
    "byte[]", 
    "char[]", 
    "float32[]", 
    "float64[]", 
    "int8[]", 
    "uint8[]", 
    "int16[]", 
    "uint16[]", 
    "int32[]", 
    "uint32[]", 
    "int64[]", 
    "uint64[]", 
    "string[]", 
    "wstring[]",
]

const CustomMessageModal = (props) => {
    const classes = useStyles();
    const {id, data, setData, title, setTitle, customMessages} = props
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [curTitle, setCurTitle] = useState('')
    const [titleBackup, setTitleBackup] = useState('')
    const [customMessagesDisp, setCustomMessagesDisp] = useState([])
    useEffect(()=>{
      if(title) {
        setCurTitle(title)
      }
      else {
        setIsEditingTitle(true)
      }
    }, [title])
    useEffect(()=>{
      if(customMessages.length > 0) {
        setCustomMessagesDisp(customMessages.filter(item => item.id !== id))
      } 
    }, [customMessages])
    return (
        <div className={classes.root}>
            
            <div className={classes.tableWrapper}>
                <MaterialTable
                style={{
                    maxHeight: '100%'
                }}
                columns={[
                        {
                        title: "Name",
                        field: "name",

                        },
                    { 
                        title: "Pkg", 
                        field: "package",
                        editComponent: ({value, onChange, rowData}) => {
                          return (
                            <Select
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            >
                              <MenuItem key='primitive' value='primitive'>
                                  primitive
                              </MenuItem>
                              {message_pkgs.map((pkg, id) => (
                                <MenuItem key={pkg.name} value={pkg.name} key={id}>
                                  {pkg.name}
                                </MenuItem>
                              ))}
                            </Select>
                          )},
                    },
                    { 
                        title: "Type", 
                        field: "field_type",
                        editComponent: ({value, onChange, rowData}) => {
                          return(
                            <Select
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            >
                              
                              {rowData.package === 'primitive' ? 
                              primitive_types.map((type, id) => (
                                <MenuItem value={type} key={id}>
                                  {type}
                                </MenuItem>
                              ))
                              :
                              (rowData.package === 'custom_msgs' ? 
                              customMessagesDisp.map((message, id) => (
                                <MenuItem value={message.name} key={id} >
                                  {message.name}
                                </MenuItem>
                              ))
                              : rowData.package ? message_pkgs.find((item) => item.name === rowData.package).messages.map(item => <MenuItem value={item}>{item}</MenuItem>) :
                              null)
                              }
                            </Select>
                          )
                        }
                    }
                ]}
                title={isEditingTitle ? 
                  <input 
                    value={curTitle} 
                    onFocus={event=>{
                      const value = event.target.value
                      event.target.value = ''
                      event.target.value = value
                      setTitleBackup(curTitle)
                    }}
                    onChange={event=>{
                      setCurTitle(event.target.value)
                    }}
                    onBlur={event=>{
                      if(curTitle) {
                        setIsEditingTitle(false)
                        setTitle(curTitle)
                      }
                    }}
                    onKeyUp={event=>{
                      if(event.key==='Escape') {
                        setCurTitle(titleBackup)
                        setIsEditingTitle(false)
                      }
                      else if(event.key==='Enter') {
                        setIsEditingTitle(false)
                        setTitle(curTitle)
                      }
                    }}
                  /> : 
                  <div onClick={() => setIsEditingTitle(true)}>{curTitle}</div>}
                data={data}
                icons={{
                    Add: props => <AddIcon />,
                    Edit: props => <EditIcon />,
                    Delete: props => <DeleteIcon />,
                    Clear: props => <ClearIcon />,
                    Check: props => <CheckIcon />,
                    PreviousPage: props => <ChevronLeft />,
                    NextPage: props => <ChevronRight />,
                }}
                editable={{
                    onRowAdd: newData =>
                    new Promise((resolve, reject) => {
                        setData([...data, {name: newData.name, package: newData.package, field_type: newData.field_type}]);
                        // setTimeout(() => {
                        // setData([...data, newData]);

                        resolve();
                        // }, 1000);
                    }),
                    onRowUpdate: (newData, oldData) =>
                    new Promise((resolve, reject) => {
                        const dataUpdate = [...data];
                        const index = oldData.tableData.id;
                        dataUpdate[index] = {name: newData.name, package: newData.package, field_type: newData.field_type};
                        setData([...dataUpdate]);
                        // setTimeout(() => {
                        // const dataUpdate = [...data];
                        // const index = oldData.tableData.id;
                        // dataUpdate[index] = newData;
                        // setData([...dataUpdate]);

                        resolve();
                        // }, 1000);
                    }),
                    onRowDelete: oldData =>
                    new Promise((resolve, reject) => {
                        const dataDelete = [...data];
                        const index = oldData.tableData.id;
                        dataDelete.splice(index, 1);
                        setData([...dataDelete]);

                        // setTimeout(() => {
                        // const dataDelete = [...data];
                        // const index = oldData.tableData.id;
                        // dataDelete.splice(index, 1);
                        // setData([...dataDelete]);

                        // resolve();
                        // }, 1000);
                    })
                  }}
                  options={{
                    search: false,
                    grouping: false,
                    showEmptyDataSourceMessage: false,
                    showFirstLastPageButtons: false,
                    pageSize: 20,
                    pageSizeOptions: [20,],
                    draggable: false,
                    sorting: false,
                    minBodyHeight: '100%', 
                    maxBodyHeight: '100%'
                  }}
                />
            </div>
            <div className={classes.buttonDiv}>
            <Button variant="contained" color="secondary" className={classes.buttonDelete} onClick={() => props.onDelete()} disabled={false}>
                Delete
            </Button>
            <Button variant="contained" color="primary" className={classes.button} onClick={() => props.onConfirm()} disabled={isEditingTitle || title === '' || data.length === 0}>
                Save
            </Button>
            </div>
            
        </div>
    );
};

export default CustomMessageModal;