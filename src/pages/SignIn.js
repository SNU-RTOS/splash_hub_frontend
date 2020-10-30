import React, {useState} from 'react';
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
import {useHistory} from "react-router-dom";
import {request, set_token} from '../utils/axios';
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
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    width: '100px',
    height: '50px',
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
    textTransform: 'none',
  },
  words: {
      marginTop: theme.spacing(6),
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  }
}));

const SignIn = () => {
  const classes = useStyles();
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const request_signin = async () => {
    try {
        const res = await request('post', '/authorization/rest_auth/login/', {
            email: email,
            password: password,
        })
        set_token(res.data.key)
        storage.set('token', res.data.key)
        history.push('/')
    } catch(err) {
        if(err.response) {
            if(err.response.status === 400) {
                console.log(err.response.data)
                if('email' in err.response.data) {
                    alert('Enter valid email')
                }
                else if('password' in err.response.data) {
                    alert('Enter valid password')
                }
                else if('non_field_errors' in err.response.data) {
                    alert('Invalid email or password')
                }
            }
        }
        else {
            alert('Unknown error')
        }
    }
  }
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <a href="/">
            <img className={classes.logo} src="/images/splash_logo_black.png" alt="logo"/>
        </a>
        <div className={classes.words}>
            <Typography variant="h4" fontWeight="bold">
            <Box fontWeight="fontWeightBold">
                Welcome Back
            </Box>
            </Typography>
            <Typography variant="h8">
            Sign in with your email
            </Typography>
        </div>
        <div className={classes.form}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            onChange={(e) => {
                setEmail(e.target.value)
            }}
            onKeyPress={(e) => {
                if(e.key === 'Enter') {
                    request_signin()
                }
            }}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            onChange={(e) => {
                setPassword(e.target.value)
            }}
            onKeyPress={(e) => {
                if(e.key === 'Enter') {
                    request_signin()
                }
            }}
          />
          <FormControlLabel
            control={<Checkbox value="remember" color="primary" />}
            label="Remember me"
          />
          <Button
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
            onClick={request_signin}
          >
            Sign In
          </Button>
          <Grid container>
            <Grid item xs>
              <Link href="#" variant="body2">
                Forgot password?
              </Link>
            </Grid>
            <Grid item>
              <Link href="/signup" variant="body2">
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </div>
      </div>
      <Box mt={8}>
        <Copyright />
      </Box>
    </Container>
  );
}

export default SignIn;