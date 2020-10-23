import {request} from "../utils/axios";
import { LOGIN, AUTH_USER } from "./types";


export const authUser = async () => {
  const data = await request("get", "/authorization/user/info/");
  return {
    type: AUTH_USER,
    payload: data,
  };
}