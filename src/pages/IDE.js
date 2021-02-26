import React, { useState, useEffect } from 'react';
import Header from '../components/Common/Header';
import Explorer from '../components/IDE/Explorer';
import { makeStyles, AppBar, Button } from '@material-ui/core';
import {DragSizing} from 'react-drag-sizing'

import Editor from '../components/IDE/Editor';
import TerminalWrapper from '../components/IDE/TerminalWrapper';
import { request } from '../utils/axios';
import { HotKeys } from "react-hotkeys";
import { string_deep_copy } from '../utils/util';

const useStyles = makeStyles((theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
        height: 'calc(100vh - 55px)',
        width: '100vw',
    },
    headerSpace: {
        width: '100%',
        height: '30px',
    },
    leftDiv: {
        minWidth: '15%',
        maxWidth: '50%',
        width: '15%',
        height: '100%',
    },
    rightDiv: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: '50%',
        maxWidth: '85%',
        width: '85%',
        height: '100%',
    },
    editor: {
        width: '100%',
        height: '70%',
        minHeight: '30%',
        maxHeight: '70%',
        backgroundColor:'#161616'

    },
    terminal: {
        width: '100%',
        height: '30%',
        minHeight: '30%',
        maxHeight: '70%',
    },
    statusBar: {
        width: '100%',
        height: '25px',
        backgroundColor: '#3d3d3d'
    },
    appBar: {
        height: '30px',
        backgroundColor: '#3d3d3d',
        flexDirection: 'row',
        display: 'flex'
    },
    logo: {
        height: 24,
        width : 54,
        paddingTop: 5,
        paddingLeft: 5,
    },
    appBarRight: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end'
    },
    button: {
        textTransform: 'none'
    }
}))
const confirm = (message = null, onConfirm, onCancel) => {
    console.log(onConfirm)
    if (!onConfirm || typeof onConfirm !== "function") {
        return;
    }
    if (onCancel && typeof onCancel !== "function") {
        return;
    }

    const confirmAction = () => {
        if (window.confirm(message)) {
        onConfirm();
        } else {
        onCancel();
        }
    };

    return confirmAction;
};
const IDE = (props) => {
    const classes = useStyles()
    const [code, setCode] = useState('')
    const [curOpenedFile, setCurOpenedFile] = useState(null)
    const [codeMap, setCodeMap] = useState({})
    const codeTree = props.location.state.codeTree;
    const project_id = props.location.state.project_id;

    const handleSaveFile = async (path) => {
        const path_splited = path.split('/')
        const name = path_splited[path_splited.length - 1]
        const path_renamed = path.slice(path_splited[1].length + 1, path.length)
        const response = await request('put', '/project/code/'+project_id+'/('+path_renamed+')/', {
            code: codeMap[path].cur_code
        })
        codeMap[path].saved_code = codeMap[path].cur_code
    }
    const handleActiveFile = (path) => {
        setCurOpenedFile(path)
    }
    const handleCodeChange = (value) => {
        codeMap[curOpenedFile] = {
            cur_code: value
        }
    }
    const handleOpenFile = async (path) => {
        if(codeMap[path]){
            setCode(codeMap[path].cur_code)
            setCurOpenedFile(path)
        } 
        else {
            const path_splited = path.split('/')
            const name = path_splited[path_splited.length - 1]
            const path_renamed = path.slice(path_splited[1].length + 1, path.length)
            try {
                const response = await request('get', '/project/code/'+project_id+'/('+path_renamed+')/');
                if(response.status === 200) {
                    setCode(response.data)
                    codeMap[path] =
                    {
                        saved_code:response.data,
                        cur_code:response.data,
                    }
                    setCurOpenedFile(string_deep_copy(path))
                }
                else {
                    alert('Unknown error')
                }
            } catch(err) {
                console.log(err)
                alert('Unknown error')
            }
        }
    }
    const changeCurFile = (path) => {
        setCurOpenedFile(path);
        setCode(codeMap[path].cur_code)
    }
    
    const handleExit = () => {
        let unsaved_flag = false
        for (let key in codeMap) {
            if (codeMap[key].cur_code !== codeMap[key].saved_code) {
                unsaved_flag = true;
                break;
            }
        }
        const goBack = props.history.goBack
        if(unsaved_flag) {
            const exit = confirm("There are unsaved changes. Do you want to continue?", 
                goBack,
                () => {}
            )
            exit()
        }
        else {
            const exit = confirm("Do you want to exit?", 
                goBack,
                () => {}
            )
            exit()
        }
    }
    return (
        <div>
            <AppBar className={classes.appBar}>
                <a href="/">
                    <img 
                    alt="logo"
                    className={classes.logo}
                    src="/images/splash_logo.png"/>
                </a>
                <div className={classes.appBarRight}>
                        <Button
                            className={classes.button}
                            color="inherit"
                            onClick={handleExit}
                        >
                            Exit
                        </Button>
                        <Button
                            className={classes.button}
                            color="inherit"
                        >
                            Save
                        </Button>
                        <Button
                            className={classes.button}
                            color="inherit"
                        >
                            Build
                        </Button>
                    </div>
            </AppBar>
            <div className={classes.headerSpace}/>
            <div className={classes.container}>
                <DragSizing border="right" className={classes.leftDiv}>
                    <Explorer codeTree={codeTree} openFile={handleOpenFile}/>
                </DragSizing>
                <DragSizing className={classes.rightDiv}>
                    <DragSizing border="bottom" className={classes.editor}>
                        <Editor fileName={curOpenedFile} changeFile={changeCurFile} code={code} onChange={handleCodeChange} saveFile={handleSaveFile} setCurOpenedFile={handleActiveFile}/>
                    </DragSizing>
                    <DragSizing className={classes.terminal}>
                        <TerminalWrapper project_id={project_id}/>
                    </DragSizing>
                </DragSizing>
            </div>
            <div className={classes.statusBar}/>
        </div>
    );
};

export default IDE;