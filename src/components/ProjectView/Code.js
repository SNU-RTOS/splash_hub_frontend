import React from 'react';
import FileTree from './FileTree';
const Code = (props) => {
    const {codeTree} = props
    return (
        <FileTree codeTree={codeTree}></FileTree>
    );
};

export default Code;