import React, { useState, useEffect, useRef } from 'react';

import { makeStyles } from '@material-ui/core';
import Terminal from 'terminal-in-react';
import { request } from '../../utils/axios';

const useStyles = makeStyles((theme) => ({
    root: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'black'
    },
    terminal: {
        height: '100%',
        width: '100%',
    }
}))
const password = btoa('root')
const url = "http://localhost:8888/?hostname=localhost&port=11111&username=root&password="+password
const TerminalWrapper = (props) => {
    const classes = useStyles();
    const {project_id, } = props
    const [msg, setMsg] = useState('')
    const [workdir, setWorkdir]= useState('/root/dev_ws')
    const ref = useRef()
    useEffect(()=> {
        console.log(password)

        // document.getElementsByClassName("terminal-base")[0].style.minHeight = "100%"
        // document.getElementsByClassName("terminal-base")[0].childNodes[0].childNodes[1].style.overflow = "hidden"
        
    }, [])
    const executeCommand = (cmd, print) => {
        let cmd_str = ''
        cmd.map(item => {
            cmd_str += item + ' '
        })
        console.log(cmd_str)
        request('post', '/project/terminal/'+project_id+'/',
        {
            workdir: workdir,
            cmd: cmd_str
        }).then(response => {
            print(response.data)
        }   
        ) 
    }
    return (
        <div className={classes.root}>
           {/* <Terminal
            ref={ref}
            color='green'
            backgroundColor='#161616'
            barColor='black'
            style={{ fontWeight: "bold", fontSize: "1em", height: '100%'}}
            commandPassThrough={(cmd, print) => executeCommand(cmd, print)}
            hideTopBar
            startState='maximised'
            /> */}
            <iframe src={url} className={classes.terminal}/>
        </div>
    );
};

export default TerminalWrapper;