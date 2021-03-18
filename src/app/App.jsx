import React, {useState, useEffect} from 'react';
import {BrowserRouter as Router, Route} from 'react-router-dom';
import Toggle from 'react-toggle';
import {CSSTransition} from 'react-transition-group';
import Home from './Pages/Home';
import BobaWatch from './Pages/BobaWatch';
import {getTheme, setTheme as updateTheme} from './controller/theme';
import './styles/main.scss';
import './App.scss';

const Page = ({path, component}) => (
    <Route exact path={path}>
        {({ match }) => (
            <CSSTransition unmountOnExit mountOnEnter in={match != null} timeout={200} classNames="fade-quick">
                <div className="page">
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
        <div>
            <label className="t-w">
                <Toggle checked={!!theme} icons={false} onChange={() => {setTheme(+!theme)}} />
            </label>
            <Router basename={process.env.PUBLIC_URL}>
                <Page path="/" component={<Home />}/>
                <Page path="/boba-watch" component={<BobaWatch/>}/>
                <Route path="/learn-ryqn-dev" render={() => (window.location = "https://learn.ryqn.dev/")}/>
            </Router>
        </div>
	);
}

export default App;
