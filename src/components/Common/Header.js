import React, {useEffect, useState} from 'react';
import {fade, makeStyles} from '@material-ui/core/styles';
import {useHistory} from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import SearchIcon from '@material-ui/icons/Search';
import InputBase from '@material-ui/core/InputBase';
import Button from '@material-ui/core/Button';
import storage from '../../utils/storage';
import {authUser} from '../../_actions/userAction';


const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
    sticky: {
        width: '100%',
        position: 'fixed',
        top: 0,
    },
    logoWrapper: {
        alignSelf: 'center',
        color: '#cecece',
        display: 'flex',
        flexDirection: 'row',
        textDecoration: 'none',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 10,
    },
    logo: {
        height: 35,
        width : 80,
    },
    appBar: {
        display: 'flex',
        flexDirection: 'row',
    },
    search: {
        position: 'relative',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: fade(theme.palette.common.white, 0.15),
        '&:hover': {
          backgroundColor: fade(theme.palette.common.white, 0.25),
        },
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('md')]: {
          marginLeft: theme.spacing(1),
          width: 'auto',
        },
      },
      searchIcon: {
        padding: theme.spacing(0, 2),
        height: '100%',
        position: 'absolute',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      inputRoot: {
        color: 'inherit',
      },
      inputInput: {
        padding: theme.spacing(1, 1, 1, 0),
        // vertical padding + font size from searchIcon
        paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          width: '12ch',
          '&:focus': {
            width: '50ch',
          },
        },
      },
      grow: {
        flexGrow: 1,
      },
      buttonWrapper: {
        marginLeft: '10px',
        display: 'flex',
        flexDirection: 'row',
      },
      button: {
        textTransform: 'none',
      }
}))
const Header = (props) => {
    const classes = useStyles()
    const { sticky } = props;
    const history = useHistory();
    const [token, setToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    useEffect(() => {
        const temp = storage.get('token')
        setToken(temp);
    }, [])
    useEffect(() => {
        if(token) {
            authUser().then(res => {
                setUserInfo(res.payload.data);
            }).catch(err => {
                history.push('/signout')
            })
        }
    }, [token])
    return (
        <div className={classes.root || sticky ? classes.sticky : null}>
            <AppBar position="static" className={classes.appBar}>
                <a className={classes.logoWrapper} href="/">
                    <img 
                    alt="logo"
                    className={classes.logo}
                    src="/images/splash_logo.png"/>
                </a>
                <Toolbar className={classes.grow}>
                    <div className={classes.search}>
                        <div className={classes.searchIcon}>
                            <SearchIcon />
                        </div>
                        <InputBase
                        placeholder="Search…"
                        classes={{
                            root: classes.inputRoot,
                            input: classes.inputInput,
                        }}
                        inputProps={{ 'aria-label': 'search' }}
                        />
                    </div>
                    <div className={classes.grow} />
                    <div className={classes.buttonWrapper}>
                    <Button color="inherit" className={classes.button} href="/search">Explore</Button>
                    <Button color="inherit" className={classes.button} href={userInfo ? `/projects/${userInfo.username}` : '/projects/'}>Projects</Button>
                    {token === null ? <Button color="inherit" className={classes.button} href="/signin">Sign in</Button> : null}
                    </div>
                    
                </Toolbar>
            </AppBar>
        </div>
    );
};

export default Header;