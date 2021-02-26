import React, {useEffect, useState} from 'react';
import Container from '@material-ui/core/Container';
import { Listing, Entry, Icon, Name, LastSaved } from "@nteract/directory-listing";
import {useHistory} from 'react-router-dom'
import {makeStyles} from '@material-ui/core';
import {request} from '../../utils/axios';
import FileView from './FileView';

const useStyles = makeStyles((theme) => ({
    pathDiv: {
        display: 'flex',
        flexDirection: 'row',
        height: '40px',
        color: 'rgba(67, 67, 67, 0.8)',
        fontWeight: 'bold'
    },
    pathItem: {
        cursor: 'pointer',
        marginRight: '5px',
        marginLeft: '5px',
    },

}));
const FileTree = (props) => {
    const {id, codeTree} = props
    const [curPath, setCurPath] = useState([])
    const [curDir, setCurDir] = useState(null)
    const [curFileName, setCurFileName] = useState(null);
    const [curFileData, setCurFileData] = useState(null);
    const classes = useStyles();
    const history = useHistory()
    useEffect(() => {
        console.log(codeTree)
        explore_path(curPath, codeTree.children);
    }, [curPath]);
    const explore_path = (path, children) => {
        if(path.length === 0) {
            children.sort((a, b) =>{
                if(a.children && b.children == undefined) {
                    return -1;
                }
                else if(a.children == undefined && b.children) {
                    return 1;
                }
                else if(a.name > b.name){
                    return 1;
                }
                else {
                    return -1;
                }
            })
            setCurDir(children);
        }
        else {
            let next_path = path.slice();
            let next_dir = next_path.shift();
            let next_children = children.find((element) => {
                return element.name === next_dir;
            })
            explore_path(next_path, next_children.children);
        }
    }
    const handle_move_dir = (name) => {
        let cur_path = curPath.slice();
        cur_path.push(name);
        setCurPath(cur_path);
        // let path_with_slash = id + '/' + name + '/';
        // history.push(path_with_slash);
    }
    const handle_back = () => {
        let cur_path = curPath.slice();
        cur_path.pop();
        setCurPath(cur_path);
        // history.goBack()
    }
    const handle_open_file = async (name) => {
        let cur_path = '';
        curPath.map(path => {
            cur_path = cur_path + '/' + path
        })
        cur_path = cur_path + '/' + name
        try {
            const response = await request('get', '/project/code/'+id+'/('+cur_path+')/');
            if(response.status === 200) {
                setCurFileData(response.data)
                setCurFileName(name)
            }
            else {
                alert('Unknown error')
            }
        } catch(err) {
            alert('Unknown error')
        }
    }
    if(codeTree) {
        return (
            <Container>
                <div className={classes.pathDiv}>
                    <div>
                    <a className={classes.pathItem} 
                    onClick={() => {
                        setCurFileData(null)
                        setCurFileName(null)
                        setCurPath([])
                    }}>
                        {codeTree.name}
                    </a>
                    /
                    </div>
                    
                    {curPath.map((item, index) => {
                        return (
                            <div>

                            <a key={index} className={classes.pathItem}
                            onClick={() => {
                                const path_new = curPath.slice(0, index+1);
                                setCurFileData(null)
                                setCurFileName(null);
                                setCurPath(path_new)
                                
                            }}>
                            {item}
                            </a> 
                            /
                            </div>
                        )
                    })}
                    {curFileName ? <div className={classes.pathItem}>{curFileName}</div>: null}
                </div>
                {curFileName
                ?
                <FileView fileName={curFileName} fileData={curFileData}/> 
                :
                <Listing>
                    {curPath.length === 0 ? null : 
                    <Entry fileType={"directory"}>
                        <Icon fileType={"directory"} />
                        <Name>
                            <a style={{cursor: 'pointer'}} onClick={handle_back}>..</a>            
                        </Name>
                        <LastSaved lastModified="" />
                    </Entry>}
                    {curDir ? curDir.map((item)=>{
                        return (
                            <Entry fileType={item.children ? "directory" : "file"}>
                                <Icon fileType={item.children ? "directory" : "file"} />
                                <Name>
                                    <a style={{cursor: 'pointer'}} onClick={item.children ? () => handle_move_dir(item.name) : () => handle_open_file(item.name)}>{item.name}</a>            
                                </Name>
                                <LastSaved lastModified={item.last_modified} />
                            </Entry>
                        )
                    }): null}
                </Listing>}
                
            </Container>
        );
    }
    return <div/>
};

export default FileTree;