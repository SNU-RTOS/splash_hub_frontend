import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {useHistory} from "react-router-dom";
import { authUser } from "../_actions/userAction";
import {set_token} from "./axios";
import storage from "./storage";

export default (Component, option) => {
  //option
  // null => 아무나 출입가능
  // true => 로그인한 유저만 출입 가능
  // false => 로그인한 유저는 출입 불가능
  const AuthCheck = (props) => {
    const [userInfo, setUserInfo] = useState(null)
    const auth = () => {
        authUser().then(result => {
            setUserInfo(result.payload.data)
            if(option === null) {
                //
            }
            else if(option === true) {
                if(result.payload === null) {
                    props.history.push('/signin');
                }
            }
            else if(option === false) {
                if(result.payload !== null) {
                    props.history.push('/');
                }
            }
        });
    }
    useEffect(() => {
        const token = storage.get('token');
        let res = null;
        
        if(token) {
            set_token(token)
            auth()
        }
        
    }, []);
    return Component(props, userInfo);
  }

  return AuthCheck;
}