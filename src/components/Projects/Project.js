import React, {useEffect} from 'react';
import './Project.scss';

const Project = ({expand, id, name, type, year, image}) => {
    return (
        <div className="p-w">
            <div className="p-img-w">
				<div className="item">
					<img className="img" src={image} alt={name + ' banner'} />
					<img className="img-large" src={image} alt={name + ' banner'} />
				</div>
			</div>
            <span>{type} ⦿ {year}</span>
            <h2>{name}</h2>
            <p> see more </p>
        </div>
    )
}


export default Project;
