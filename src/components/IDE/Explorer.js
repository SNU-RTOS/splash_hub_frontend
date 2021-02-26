import React, { useRef } from 'react';
import FolderTree, { testData } from 'react-folder-tree';
import { makeStyles } from '@material-ui/core';
import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';
const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#2d2d2d',
        color: '#b7b7b7',
        overflow: 'auto'
    },
}))
let count = 0

const Explorer = (props) => {
  const classes = useStyles()

  const {id, codeTree, openFile} = props
  const onTreeStateChange = state => console.log('tree state: ', state);
  const renderTree = (nodes, parent) => {
      if(nodes.name.indexOf('__init__.py') > -1) {
        return null
      }
      const path = parent + '/' + nodes.name
      nodes.path = path
      return(
        <TreeItem key={path} nodeId={path} label={nodes.name} onDoubleClick={nodes.children ? null : () => handleDoubleClick(path)}>
        {nodes.children ? nodes.children.map((node) => renderTree(node, path)) : null}
        </TreeItem>
      )
  };
  const ref = useRef(null);
  const handleDoubleClick = (path) => {
    openFile(path)
  }
  return (
    <TreeView
      ref={ref}
      className={classes.root}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpanded={['root']}
      defaultExpandIcon={<ChevronRightIcon />}
    >
        {renderTree(codeTree, '')}
    </TreeView>
  )
};

export default Explorer;