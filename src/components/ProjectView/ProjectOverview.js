import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';

const useStyles = makeStyles((theme) => ({
    appBarSpacer: theme.mixins.toolbar,
    overview: {
        width: '50%',
        height: '100%',
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
    }
  }))

function createData(id, name, author, desc, date) {
    return { id, name, author, desc, date};
  }
  

const ProjectOverview = ({data}) => {
    const classes = useStyles();

    if(data) {
        return (
            <div className={classes.overview}>
                    <Typography variant="h5">
                        {data.name}
                    </Typography>
                    <div className={classes.authorWrapper}>
                    <Typography variant="subtitle1">
                        by
                    </Typography>
                    <Link className={classes.author} href={'/projects/'+data.author} >
                        <Typography variant="subtitle1">
                            {data.author}
                        </Typography>
                    </Link>
                    </div>
                    <Typography variant="body1">
                        {data.desc.split("\\n").map(line => {
                            return (<span>{line}<br/></span>)
                        })}
                    </Typography>
                </div>
        );
    }
    return null;
};

export default ProjectOverview;