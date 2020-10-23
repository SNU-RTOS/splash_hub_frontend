import axios from "axios";
import {API_HOST} from "../config";

export const request = (method, url, data) => {
  return axios({
    method,
    url: API_HOST + url,
    data,
  })
};

export const set_token = (token) => {
    axios.defaults.headers.common['Authorization'] = 'Token ' + token
}