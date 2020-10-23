import React, {useState, useEffect} from 'react';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Link from '@material-ui/core/Link';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { useHistory, withRouter } from "react-router-dom";
import {request} from '../utils/axios';
import storage from '../utils/storage';

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit">
      Seoul national university RTOS Lab

      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    width: '200px',
    height: '100px',
    margin: '50px',
  },
  paper: {
    width: '477px',
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: '80px',
    paddingRight: '80px',
    paddingTop: '35px',
    paddingBottom: '35px',
    border: 'solid 2px #ededed'
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  words: {
    marginTop: theme.spacing(6),
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  textField: {
    width: '352px',
  },
  button: {
    width: '109px',
    height: '52px',
    marginLeft: '16px',
    fontSize: '13px',
  },
}));
const pattern_email = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;

const pattern_username = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"\s]/;
const pattern_username2 = /[0-9]|[a-z]|[A-Z]|[가-힣]/g;
const pattern_username3 = /[ㄱ-ㅎㅏ-ㅣ]/;
const pattern_password = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,20}$/;

const DUPLICATION_CHECK_INIT = 0
const DUPLICATION_CHECK_RETRY = 1
const DUPLICATION_CHECK_DONE = 2
const getByte = (str) => {
    return str
        .split('') 
        .map(s => s.charCodeAt(0))
        .reduce((prev, c) => (prev + ((c === 10) ? 2 : ((c >> 7) ? 2 : 1))), 0); // 계산식에 관한 설명은 위 블로그에 있습니다.
}
const SignUp = () => {
  const classes = useStyles();
  const history = useHistory();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  const [duplUsername, setDuplUsername] = useState(DUPLICATION_CHECK_INIT);
  const [duplEmail, setDuplEmail] = useState(DUPLICATION_CHECK_INIT);
  const request_duplicate_check_username = async () => {
        try {
            const response = await request(
                'post',
                '/authorization/check_duplication/username/',
                {
                    username: username
                }
            )
            if(response.status === 202) {
                setDuplUsername(DUPLICATION_CHECK_DONE);
                alert('Available')
            }
            else if(response.status === 226) {
                setDuplUsername(DUPLICATION_CHECK_RETRY)
                alert('Already used')
            }
            else {
                alert("Unknown error")    
            }
        } catch(err) {
            alert("Unknown error")     
        }
    }
    const request_duplicate_check_email = async () => {
        try {
            const response = await request(
                'post',
                '/authorization/check_duplication/email/',
                {
                    email: email
                }
            )
            if(response.status === 202) {
                setDuplEmail(DUPLICATION_CHECK_DONE);
                alert('Available')
            }
            else if(response.status === 226){
                setDuplEmail(DUPLICATION_CHECK_RETRY)
                alert('Already used')
            }
            else {
                alert("Unknown error")    
            }
        } catch(err) {
            alert("Unknown error")    
        }
    }
    const request_signup = async () => {
        try {
            const response = await request(
                'post',
                '/authorization/rest_auth/registration/',
                {
                    username: username,
                    email: email,
                    password: password,
                    allow_send_email: checkEmail,
                }
            )
            if(response.status === 201) {
                storage.set('token', response.data.key)
                history.push("/")
            } else {
                alert("Unknown error")        
            }
        } catch(err) {
            alert("Unknown error")    
        }
    }
    const handleCheck = (event) => {
        setCheckEmail(!checkEmail);
    }
  return (
      <div className={classes.root}>
      <a href="/">
            <img className={classes.logo} src="/images/splash_logo_black.png" alt="logo"/>
        </a>
        <div className={classes.paper}>  
        <div className={classes.words}>
        <Typography variant="h4" fontWeight="bold">
            <Box fontWeight="fontWeightBold">
                Sign Up
            </Box>
        </Typography>
        <Typography variant="h8">
            Create a Splash Account
        </Typography>
        </div>
        
        <div className={classes.form}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                className={classes.textField}
                autoComplete="fname"
                name="userName"
                variant="outlined"
                required
                fullWidth
                id="userName"
                label="User Name"
                autoFocus
                onChange = {(e) => {
                    if(getByte(e.target.value) <= 16 && !pattern_username.test(e.target.value)) {
                        e.target.value =  e.target.value
                        setUsername(e.target.value)
                        setDuplUsername(DUPLICATION_CHECK_INIT)
                    }
                    else {
                        e.target.value = username
                    }
                }}
              />
              <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    onClick={request_duplicate_check_username}
                    disabled={username.length == 0 || !pattern_username2.test(username) || pattern_username3.test(username) || duplUsername == DUPLICATION_CHECK_DONE || duplUsername == DUPLICATION_CHECK_RETRY}
                >
                    {duplUsername == DUPLICATION_CHECK_INIT ? 'Check' : duplUsername == DUPLICATION_CHECK_RETRY ? 'Unavailable' : 'Available'}
                </Button>
            </Grid>
            <Grid item xs={12}>
                <TextField
                className={classes.textField}
                variant="outlined"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                onChange= {(e) => {
                    setEmail(e.target.value)
                    setDuplEmail(DUPLICATION_CHECK_INIT)
                }}
                />
                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    onClick={request_duplicate_check_email}
                    disabled={email.length == 0 || !pattern_email.test(email) || duplEmail == DUPLICATION_CHECK_DONE || duplEmail == DUPLICATION_CHECK_RETRY}
                >
                    {duplEmail == DUPLICATION_CHECK_INIT ? 'Check' : duplEmail == DUPLICATION_CHECK_RETRY ? 'Unavailable' : 'Available'}
                </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                
                onChange={(e)=>{
                    if(e.target.value.length <= 20) {
                        setPassword(e.target.value)
                    }
                    else{
                        e.target.value = password
                    }
                }}
                error={password.length > 0 && !pattern_password.test(password)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                name="password_confirm"
                label="Confirm Password"
                type="password"
                id="password_confirm"
                autoComplete="current-password"
                helperText={
                    <div>
                    <div>Password must contain at least 8 characters,</div>
                    <div>containing at least one numeric digit and a special character</div>
                    </div>
                }
                onChange={(e)=>{
                    if(e.target.value.length <= 20) {
                        setPasswordConfirm(e.target.value)
                    }
                    else{
                        e.target.value = passwordConfirm
                    }
                }}
                error={passwordConfirm.length > 0 && password !== passwordConfirm}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox value="allowExtraEmails" color="primary" checked={checkEmail} onChange={handleCheck} />}
                label="I want to receive inspiration, marketing promotions and updates via email."
              />
            </Grid>
          </Grid>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
            onClick={request_signup}
            disabled={duplUsername !== DUPLICATION_CHECK_DONE || duplEmail !== DUPLICATION_CHECK_DONE || !pattern_password.test(password) || password != passwordConfirm}
          >
            Sign Up
          </Button>
          <Grid container justify="flex-end">
            <Grid item>
              <Link href="/signin" variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </div>
      </div>
      <Box mt={5}>
        <Copyright />
      </Box>
      </div>
      
  );
}

export default SignUp;