import React from 'react';
import {Route, Switch} from 'react-router-dom';
import EditProject from './pages/EditProject';
import Explore from './pages/Explore';
import Main from './pages/Main';
import NewProject from './pages/NewProject';
import Projects from './pages/Projects';
import ProjectView from './pages/ProjectView';
import SignIn from './pages/SignIn';
import SignOut from './pages/SignOut';
import SignUp from './pages/SignUp';
import Auth from './utils/auth';
import EditProject2 from './pages/EditProject2';
const App = () => {
  return (
    <div style={{backgroundColor: 'white'}}>
        <Switch>
            <Route path="/" component={Auth(Main, null)} exact />
            {/* <Route path="/" component={Auth(Projects, null)} exact /> */}
            <Route path="/signin" component={Auth(SignIn, false)} />
            <Route path="/signout" component={Auth(SignOut, null)} />
            <Route path="/signup" component={Auth(SignUp, false)} />
            <Route path="/projects/" component={Auth(Projects, true)} exact />
            <Route path="/projects/:uname" component={Auth(Projects, true)} exact />
            <Route path="/project/:id" component={Auth(ProjectView, true)} /> 
            <Route path="/search" component={Auth(Explore, null)} />
            <Route path="/new_project" component={Auth(NewProject, true)} exact/>
            <Route path="/edit_schematic" component={Auth(EditProject2, true)} exact/>
        </Switch>
    </div>
  );
};

export default App;
