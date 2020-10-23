import React, {useEffect, useRef, useState} from 'react';
import Header from '../components/Common/Header';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import ItemList from '../components/Projects/ItemList';
import Title from '../components/Common/Title';
import {Button, Link} from '@material-ui/core';
import {useHistory} from 'react-router-dom';
import {request} from '../utils/axios';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  
  menuButton: {
    marginRight: 36,
  },
  menuButtonHidden: {
    display: 'none',
  },
  title: {
    flexGrow: 1,
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: 'flex',
    overflow: 'auto',
    flexDirection: 'column',
  },
  fixedHeight: {
    height: 240,
  },
  horizontal: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between'
  },
  buttonNew: {
      backgroundColor: 'blue',
      color: 'white',
  }
}));

const Projects = (props, userInfo) => {
    const classes = useStyles();
    const history = useHistory();
    const [isSticky, setSticky] = useState(false);
    const [data, setData] = useState([]);
    const ref = useRef(null);
    const handleScroll = () => {
        if (ref.current) {
        setSticky(ref.current.getBoundingClientRect().top <= -50);
        }
    };
    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', () => handleScroll);
        };
    }, [])
    useEffect(() => {
        if(userInfo != null)
            history.push('/projects/'+ userInfo.username)
    }, [userInfo])
    useEffect(() => {
        if(props.match.params.uname) {
            const uname = props.match.params.uname
            request_get_list(uname)
        }
    }, [])
    const request_get_list = async (uname) => {
        try {
            const response = await request('get', '/project/list/'+uname+'/');
            if(response.status === 200) {
                setData(response.data)
            }
            else {
                console.log('Unknown error')
            }
        } catch(err) {
            console.log(err)
        }
    }
    return (
        <div>
            <Header sticky={isSticky ? true : false}/>
            <main className={classes.content}>
                <div className={classes.appBarSpacer} />
                <Container maxWidth="lg" className={classes.container}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                    <Paper className={classes.paper}>
                        <div className={classes.horizontal}>
                            <Title>My Projects</Title>
                            <Link href="/new_project">
                                <Button variant="contained" color="primary" >
                                    New
                                </Button>
                            </Link>
                        </div>
                        <ItemList data={data}/>
                    </Paper>
                    </Grid>
                </Grid>
                </Container>
            </main>
        </div>
    );
};

export default Projects;