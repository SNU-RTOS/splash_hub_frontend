import React, { useState, useEffect } from 'react';
import AceEditor from "react-ace";
import { makeStyles } from '@material-ui/core';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-xml";
import "ace-builds/src-noconflict/mode-yaml"
import "ace-builds/src-noconflict/mode-c_cpp"
import "ace-builds/src-noconflict/mode-diff"
import "ace-builds/src-noconflict/mode-haml"
import "ace-builds/src-noconflict/mode-json"
import "ace-builds/src-noconflict/mode-text"

import "ace-builds/src-noconflict/theme-chaos";
import { string_deep_copy } from '../../utils/util';
const useStyles = makeStyles((theme) => ({
    container: {
        height: '100%',
        width: '100%',
        backgroundColor:'#161616'

    },
    tabs: {
        width: '100%',
        height: '30px',
        minHeight: '30px',
    },
    tab: {
        backgroundColor: '#2d2d2d',
        height: '30px',
        minHeight: '30px',
        color: '#a6a6a6',
        fontSize: '12px',
        textTransform: 'none'
    },
    activeTab: {
        backgroundColor: '#626262',
        height: '30px',
        minHeight: '30px',
        color: '#ffffff',
        fontSize: '12px',
        textTransform: 'none'
    },
    flexContainer: {
        height: '30px',
    },
    editorWrapper: {
        height: 'calc(100% - 30px)',
        width: '100%',
    }
}))
let globalSelectedTab = null
const Editor = (props) => {
    const classes = useStyles()
    const {onChange, code, fileName, changeFile, saveFile, setCurOpenedFile} = props
    const [tabs, setTabs] = useState([])
    const [selectedTab, setSelectedTab] = useState(null)
    useEffect(() => {
        if(fileName && tabs.findIndex(i => i.path === fileName) === -1)
        {
            const fileName_splited = fileName.split('/')
            const name = fileName_splited[fileName_splited.length - 1]
            const tab = {
                name: name,
                path: fileName,
            }
            const new_tabs = [...tabs, tab]
            setTabs(new_tabs)
            setSelectedTab(tab)
            setCurOpenedFile(tab.path)
            globalSelectedTab = tab.path
        }
    }, [fileName])

    const getType = () => {
        const fileName_splited = fileName.split(".")
        const type = fileName_splited[fileName_splited.length - 1]
        if(type === 'py') {
            return "python"
        }
        else if(type === 'c' || type === 'cpp') {
            return "c_cpp"
        }
        else if(type === 'xml') {
            return "xml"
        }
        else if(type === 'json') {
            return "json"
        }
        else if(type === 'haml') {
            return "haml"
        }
        else if(type === 'yaml') {
            return "yaml"
        }
        else if(type === 'diff') {
            return "diff"
        }
        else {
            return "text"
        }
    }
    const handleSelectTab = (path) => {
        const tab = tabs.find((i) => i.path === path)
        setSelectedTab(tab)
        changeFile(path)
        setCurOpenedFile(path)
        globalSelectedTab = path

    }
    return (
        fileName ?
        <div className={classes.container}>
        <Tabs  classes={{
            root: classes.tabs,
            flexContainer: classes.flexContainer
        }}>
            {tabs.map((tab, id) => {
                if(tab === selectedTab)
                    return (<Tab key={id} onClick={()=>handleSelectTab(tab.path)} style={{height:'30px', padding: '0px'}} label={tab.name} classes={{root: classes.activeTab}}/>)
                else 
                    return (<Tab key={id} onClick={()=>handleSelectTab(tab.path)} style={{height:'30px', padding: '0px'}} label={tab.name} classes={{root: classes.tab}}/>)

            })}
        </Tabs>
        <div className={classes.editorWrapper}>
        <AceEditor
            mode={getType()}
            theme="chaos"
            onChange={onChange}
            name="editor"
            editorProps={{ $blockScrolling: true }}
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={code}
            width='100%'
            height='100%'
            showPrintMargin={false}
            commands = {[{// Commands are key binding arrays.
                name: 'saveFile', // The name of the key binding.
                bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
                exec: () => {
                    saveFile(globalSelectedTab)
                },
            }]}
        />
        </div>
        </div> 
       
        : <div style={{width:'100%', height: '70%', backgroundColor:'#161616'}}/>
    );
};

export default Editor;