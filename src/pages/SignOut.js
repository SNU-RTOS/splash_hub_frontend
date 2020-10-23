import React, {useEffect} from 'react';
import {useHistory} from "react-router-dom";
import storage from '../utils/storage';

const SignOut = () => {
    const history = useHistory();
    useEffect(()=>{
        storage.remove('token');
        history.push('/')
    }, [])
    return (
        <div>
            
        </div>
    );
};

export default SignOut;