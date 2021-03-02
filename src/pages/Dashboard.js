import React, { useState } from 'react';
import { makeStyles, Divider, List, ListItem, ListItemText } from '@material-ui/core';
import BuildUnitsPanel from '../components/Dashboard/BuildUnitsPanel';
import DeploymentPanel from '../components/Dashboard/DeploymentPanel';
import DashboardPanel from '../components/Dashboard/DashboardPanel';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',
        paddingTop: 24,
    }, 
    sidePanel: {
        width: 200,
        height: '100%',
        borderRight: 'solid 1px #aeaeae',
    },
    selectedTab: {
        fontWeight: 'bold',
        color: '#3f51b5'
    },
    tab: {
        fontWeight: 'normal',
        color: 'black'
    },
    mainPanel: {
        flex: 1,
    }
}));

const Dashboard = () => {
    const classes = useStyles()
    const [tabIndex, setTabIndex] = useState(0)
    const drawer = (
        <div>
          <List>
            {['Dashboard', 'Build Units', 'Deployment'].map((text, index) => (
              <ListItem button key={text} onClick={() => setTabIndex(index)}>
                <ListItemText primary={text} className={tabIndex === index ? classes.selectedTab : classes.tab}/>
              </ListItem>
            ))}
          </List>
        </div>
      );
    const curTab = () => {
        if(tabIndex === 0 ) {
            return <DashboardPanel/>
        }
        else if(tabIndex === 1){
            return <BuildUnitsPanel/>
        }
        else if(tabIndex === 2) {
            return <DeploymentPanel/>
        }
    }
    return (
        <div className={classes.root}>
            <div className={classes.sidePanel}>
                {drawer}
            </div>
            <div className={classes.mainPanel}> 
                {curTab()}
            </div>
        </div>
    );
};


export default Dashboard;