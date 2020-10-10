import React, {useState, useEffect, Fragment} from 'react';
import {BrowserRouter as Router, Route} from 'react-router-dom';
import {CSSTransition} from 'react-transition-group';
import Home from './Pages/Home';
import BobaWatch from './Pages/BobaWatch';
import {getTheme, setTheme as updateTheme} from './controller/theme';
import Toggle from 'react-toggle';
import './styles/main.scss';

const Page = ({path, children, component}) => (
    <Route exact path={path}>
        {({ match }) => (
            <CSSTransition unmountOnExit mountOnEnter in={match != null} timeout={100} classNames="fade-quick">
                <div className="page with-user">
                    {component}
                </div>
            </CSSTransition>
        )}
    </Route>
);

const App = () => {
    const [theme, setTheme] = useState(getTheme());

    useEffect(() => {updateTheme(theme)}, [theme]);

	return (
        <Fragment>
            <label className="t-w">
                <Toggle checked={!!theme} icons={false} onChange={() => {setTheme(+!theme)}} />
            </label>
            <Router basename={process.env.PUBLIC_URL}>
                <Page path="/" component={Home}/>
                <Page path="/boba-watch" component={BobaWatch}/>
            </Router>
        </Fragment>
	);
}

export default App;
