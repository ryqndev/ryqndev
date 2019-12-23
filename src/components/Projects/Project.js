import React, {useState} from 'react';
import {data} from './data';
import './Project.scss';

const Project = ({expand, id, name, type, year, image}) => {
    return (
        <div className="p-w">
            <div className="p-img-w">
                <img src={image} alt={name + " graphic"} />
            </div>
            <span>{type} ⦿ {year}</span>
            <h2>{name}</h2>
            <p> see more </p>
        </div>
    )
}

export default Project;
