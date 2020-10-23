import React, {useEffect, useRef, useState} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Header from '../components/Common/Header';

const useStyles = makeStyles((theme) => ({
  appBarSpacer: theme.mixins.toolbar,
}))
const Explore = (props) => {
    const classes = useStyles();
    const { params } = props.match;
    const [isSticky, setSticky] = useState(false);
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
    return (
        <div>
            <Header sticky={isSticky ? true : false}/>
            <div className={classes.appBarSpacer} />
        </div>
    );
};

export default Explore;