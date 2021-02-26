import React, {useEffect, useRef, useState} from 'react';
import Header from '../components/Common/Header';
import storage from '../utils/storage';
import SignIn from './SignIn';
import SignUp from './SignUp';
import Dashboard from './Dashboard';

const Main = (props, userInfo) => {
    const [isSticky, setSticky] = useState(false);
    const [token, setToken] = useState(null);
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
        const temp = storage.get('token')
        setToken(temp);
    }, [])
    return (
        <div>
            <Header sticky={isSticky ? true : false}/>
            <div style={{paddingTop: 40}}/>
            {token ? <Dashboard/> : <SignUp/>}
        </div>
    );
};

export default Main;