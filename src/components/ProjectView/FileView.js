import {makeStyles} from '@material-ui/core';
import React, {useEffect, useState} from 'react';

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
        padding: '20px',
    }
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
            let file_type = fileName.split('.')[1];
            setFileType(file_type)
        }
    }, [fileName])
    return (
        <div className={classes.root}>
            <div className={classes.statusBar}>
                {lines.length} lines
            </div>
            <div className={classes.container}>
            {lines.map(line => {
                return (
                    <div style={{textIndent: line.indent * 20}}>
                        {line.data}
                    </div>
                )
            })}
            </div>
            
        </div>
    );
};

export default FileView;
