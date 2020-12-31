import React, {useEffect, useRef, useState} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Header from '../components/Common/Header';
import ProjectOverview from '../components/ProjectView/ProjectOverview';
import Container from '@material-ui/core/Container';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {useHistory} from 'react-router-dom';
import TabPanel from '../components/ProjectView/TabPanel';
import Code from '../components/ProjectView/Code';
import Schema from '../components/ProjectView/Schema';
import Buttons from '../components/ProjectView/Buttons';
import {request} from '../utils/axios';
import FileSaver from 'file-saver';
import axios from 'axios';
import {API_HOST} from '../config';
const useStyles = makeStyles((theme) => ({
  appBarSpacer: theme.mixins.toolbar,
  overview: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px'
  },
  authorWrapper: {
    display: 'flex',
    flexDirection: 'row',
    paddingTop: '10px',
    paddingBottom: '15px',
  },
  author: {
    marginLeft: '5px',
  },
  tab: {
    textTransform: 'none', 
  },
  topPane: {
    display: 'flex',
    flexDirection: 'row',
  }
}))

function createData(id, name, author, desc, date) {
return { id, name, author, desc, date};
}
function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}  
// const data = createData(0, 'LKAS', 'Cheonghwa Lee', 'Splash LKAS application on TORCS simulator', '28 September, 2020');

const ProjectView = (props) => {
    const history = useHistory();
    const classes = useStyles();
    const { params } = props.match;
    const [isSticky, setSticky] = useState(false);
    const [value, setValue] = useState(0);
    const [schemaData, setSchemaData] = useState(null);
    const [codeTree, setCodeTree] = useState(null);
    const [data, setData] = useState(null)
    const ref = useRef(null);
    const handleScroll = () => {
        if (ref.current) {
        setSticky(ref.current.getBoundingClientRect().top <= -50);
        }
    };
    const handleChange = (event, newValue) => {
        setValue(newValue);
        // if(newValue === 0) {
        //     if(history.location.pathname !== '/project/'+params.id) {
        //         history.replace('/project/'+params.id, '/')
        //     }
        // }
      };
    const request_get_schema = async (id) => {
        try {
            const response = await request('get', '/project/info/'+id+'/')
            if(response.status === 200) {
                setSchemaData(response.data.schema)
                setCodeTree(response.data.code_tree)
                setData(createData(id, response.data.name, response.data.author_info.username,  response.data.description, response.data.wrote_on))
            }
            else {
                console.log('Unknown error')
                history.push('/projects')
            }
        } catch(e) {
            console.log(e)
            history.push('/projects')
        }
    }
    useEffect(() => {
        if(params.id) {
            request_get_schema(params.id);
        }
        else {
            history.push('/projects')
        }
    }, [])
    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', () => handleScroll);
        };
    }, [])
    const str2bytes = (str) => {
        var bytes = new Uint8Array(str.length);
        for (var i=0; i<str.length; i++) {
            bytes[i] = str.charCodeAt(i);
        }
        return bytes;
    }
    const request_download_code = async () => {
        try {
            axios.get( 
                API_HOST + '/project/code/download/'+params.id+'/', 
                {
                    responseType: 'arraybuffer'
                } )
                .then(response => {
                    const blob = new Blob([response.data], {type: "application/zip"});
                    FileSaver.saveAs(blob, data.name+'.zip'); 
                })
        } catch(e) {
            console.log(e)
        }
    }
    const go_to_edit_schema = () => {
        history.push('/edit_schematic', {project_id: params.id, is_new: false})
    }
    return (
        <div>
            <Header sticky={isSticky ? true : false}/>
            <div className={classes.appBarSpacer} />
            <div className={classes.topPane}>
                <ProjectOverview data={data}/>
                <Buttons request_download_code={request_download_code} go_to_edit_schema={go_to_edit_schema}/>
            </div>
            <AppBar position="sticky" color='transparent'>
                <Tabs value={value} onChange={handleChange} aria-label="tabs" >
                    <Tab className={classes.tab} label="Schematic" {...a11yProps(0)} />
                    <Tab className={classes.tab} label="Code" {...a11yProps(1)} />
                </Tabs>
            </AppBar>
            <TabPanel value={value} index={0}>
                <Schema schemaData={schemaData}/>
            </TabPanel>
            <TabPanel value={value} index={1}>
                <Code id={params.id} codeTree={codeTree}/>
            </TabPanel>
        </div>
    );
};

export default ProjectView;