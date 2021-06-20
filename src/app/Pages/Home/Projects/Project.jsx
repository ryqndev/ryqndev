import { memo } from 'react';
import { Link } from 'react-router-dom';

const Project = ({ id, name, type, year, image }) => {
	return (
		<Link to={id} className='p-w'>
			<div className='p-img-w'>
				<div className='item'>
					<img
						id={id + 'image'}
						className='img'
						data-aos='fade-right'
						data-aos-offset='300'
						data-aos-duration='500'
						src={image}
						alt={name + ' banner'}
					/>
				</div>
			</div>
			<div className='detail-holder'>
				<span
					data-aos='fade-right'
					data-aos-offset='0'
					data-aos-duration='500'
					data-aos-delay='150'
				>
					{type} ⦿ {year}
				</span>
				<h3
					data-aos='fade-right'
					data-aos-offset='0'
					data-aos-duration='500'
					data-aos-delay='200'
				>
					{name}
				</h3>
				<p
					data-aos='fade-right'
					data-aos-offset='0'
					data-aos-duration='500'
					data-aos-delay='250'
				>
					{' '}
					click to view{' '}
				</p>
			</div>
		</Link>
	);
};

export default memo(Project);
