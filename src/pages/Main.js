import React, {useEffect, useRef, useState} from 'react';
import Header from '../components/Common/Header';

const Main = (props, userInfo) => {
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
        </div>
    );
};

export default Main;