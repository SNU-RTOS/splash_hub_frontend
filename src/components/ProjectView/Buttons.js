import React from 'react';
import { createMuiTheme, withStyles, makeStyles, ThemeProvider } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import GetAppIcon from '@material-ui/icons/GetApp';
import EditIcon from '@material-ui/icons/Edit';
import { indigo, blue } from '@material-ui/core/colors';

const useStyles = makeStyles((theme) => ({
    root: {
        width: '50%',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: '20px',
    },
    code: {
        color: 'white',
        textTransform: 'none',
        marginRight: '10px'
    },
    edit: {
        color: 'white',
        textTransform: 'none', 
    }
}))
const theme = createMuiTheme({
    palette: {
      primary: blue,
      secondary: indigo,
    },
  });

const Buttons = (props) => {
    const classes = useStyles()
    return <div className={classes.root}>
        <ThemeProvider theme={theme}>
            <Button 
            color='primary' 
            variant="contained"
            className={classes.code}
            startIcon={<GetAppIcon/>}
            onClick={props.request_download_code}
            >
                Code
            </Button>
            <Button 
            color='secondary'
            variant="contained"
            className={classes.edit}
            startIcon={<EditIcon/>}
            onClick={props.go_to_edit_schema}
            >
                Edit
            </Button>
        </ThemeProvider>
    </div>
}

export default Buttons;