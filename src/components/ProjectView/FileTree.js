import React, {useEffect, useState} from 'react';
import Container from '@material-ui/core/Container';
import { Listing, Entry, Icon, Name, LastSaved } from "@nteract/directory-listing";
import {useHistory} from 'react-router-dom'
const FileTree = (props) => {
    const {codeTree} = props
    const [curPath, setCurPath] = useState([])
    const [curDir, setCurDir] = useState(null)
    const history = useHistory()
    useEffect(() => {
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
        let path_with_slash ='/'+ name + '/';
        history.push(path_with_slash);
    }
    const handle_back = () => {
        let cur_path = curPath.slice();
        cur_path.pop();
        setCurPath(cur_path);
        history.goBack()
    }
    if(codeTree) {
        return (
            <Container>
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
                                    <a style={{cursor: 'pointer'}} onClick={item.children ? () => handle_move_dir(item.name) : null}>{item.name}</a>            
                                </Name>
                                <LastSaved lastModified={item.last_modified} />
                            </Entry>
                        )
                    }): null}
                    {/* {codeTree.children.map((item)=>{
                        return (
                            <Entry fileType={item.children ? "directory" : "file"}>
                                <Icon fileType={item.children ? "directory" : "file"} />
                                <Name>
                                    <a>{item.name}</a>            
                                </Name>
                                <LastSaved lastModified={item.last_modified} />
                            </Entry>
                        )
                    })} */}
                </Listing>
            </Container>
        );
    }
    return <div/>
};

export default FileTree;