import React, {useEffect} from 'react';
import '../../globals/fonts.css';
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
            <h3>{name}</h3>
            <p> see more </p>
        </div>
    )
}


export default Project;
