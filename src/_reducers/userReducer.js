import { LOGIN } from "../_actions/types";

export default  (state = {}, action) => {
  switch (action.type) {
    case LOGIN:
      return { ...state, loginSuccess: action.payload };
    default:
      return state;
  }
}