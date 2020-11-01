import {makeStyles} from '@material-ui/core';
import React, {useEffect, useState} from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const useStyles = makeStyles((theme) => ({
    root: {
        border: 'solid 1px rgba(67, 67, 67, 0.2)',
        borderRadius: '6px',
    },
    statusBar: {
        borderBottom: 'solid 1px rgba(67, 67, 67, 0.2)',
        padding: '10px',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        height: '30px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    container: {
        padding: 0
    },
}))
const FileView = (props) => {
    const classes = useStyles()
    const {fileData, fileName} = props;
    const [lines, setLines] = useState([]);
    const [fileType, setFileType] = useState(null);
    useEffect(() => {
        if(fileData) {
            let lines_str = fileData.split('\n')
            let new_lines = []
            const pattern = /\s\s\s\s/g
            lines_str.map(l => {
                let indent = (l.match(pattern) || []).length;
                new_lines.push({
                    data: l,
                    indent: indent
                })
            })
            setLines(new_lines);
        }
    }, [fileData])
    useEffect(() => {
        if(fileName) {
            let name_split = fileName.split('.');
            let file_type = name_split[name_split.length - 1];
            if(file_type === 'py' || file_type === 'pyc') {
                setFileType('python')
            }
            else {
                let found_in_supported_type = SyntaxHighlighter.supportedLanguages.find(item => {
                    return item === file_type
                })
                if(found_in_supported_type) {
                    setFileType(found_in_supported_type)
                } else {
                    setFileType('text')
                }
            }
        }
    }, [fileName])
    return (
        <div className={classes.root}>
            <div className={classes.statusBar}>
                {lines.length} lines, type: {fileType}
            </div>
            <div className={classes.container}>
                <SyntaxHighlighter language={fileType} style={docco} showLineNumbers customStyle={{padding:0, margin: 0}}>
                    {fileData}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

export default FileView;
