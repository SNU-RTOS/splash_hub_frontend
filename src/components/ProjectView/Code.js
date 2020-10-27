import React from 'react';
import FileTree from './FileTree';
const Code = (props) => {
    const {id, codeTree} = props
    return (
        <FileTree id={id} codeTree={codeTree}></FileTree>
    );
};

export default Code;