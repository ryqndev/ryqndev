import React from 'react';
import {Link} from 'react-router-dom';

const Project = ({id, name, type, year, image}) => {
    return (
        <Link to={'/' + id} className="p-w">
            <div className="p-img-w">
                <div className="item">
                    <img className="img" src={image} alt={name + ' banner'} />
                </div>
            </div>
            <span>{type} ⦿ {year}</span>
            <h3>{name}</h3>
            <p> click to view </p>
        </Link>
    )
}

export default Project;