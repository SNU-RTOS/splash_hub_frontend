import React from 'react';
import { makeStyles, Paper } from '@material-ui/core';
import ViewAgendaIcon from '@material-ui/icons/ViewAgenda';
import DesktopWindowsIcon from '@material-ui/icons/DesktopWindows';

const useStyles = makeStyles((theme) => ({
    root: {
        flex: 1,
        display: 'flex',
    },
    paper: {
        flex: 1,
        height: 200,
        margin: 50,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    icon: {
        width: 64,
        height: 64,
        color: 'white'
    },
    round: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3f51b5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    textDiv: {
        marginLeft: 20,
    },
    labelText:{
        fontSize: 15,
    },
    numText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#3f51b5'
    }
}))
const DashboardPanel = () => {
    const classes = useStyles()
    return (
        <div>
            <Paper className={classes.paper} elevation={5}>
                <div className={classes.round}>
                    <ViewAgendaIcon className={classes.icon}/>
                </div>
                
                <div className={classes.textDiv}>
                    <div className={classes.numText}>
                        3
                    </div>
                    <div className={classes.labelText}>
                        Build Unit(s)
                    </div>
                </div>
            </Paper>
            <Paper className={classes.paper} elevation={5}>
                <div className={classes.round}>
                    <DesktopWindowsIcon className={classes.icon}/>
                </div>
                <div className={classes.textDiv}>
                    <div className={classes.numText}>
                        2
                    </div>
                    <div className={classes.labelText}>
                        Node(s)
                    </div>
                </div>
            </Paper>
        </div>
    );
};

export default DashboardPanel;