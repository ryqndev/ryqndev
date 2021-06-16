import { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Project = ({ id, name, type, year, image }) => {
	useEffect(() => {
		AOS.init();
	}, [image]);

	return (
		<Link to={id} className='p-w'>
			<div className='p-img-w'>
				<div
					className='item'
					data-aos='fade-right'
					data-aos-offset='300'
					data-aos-duration='500'
				>
					<img className='img' src={image} alt={name + ' banner'} />
				</div>
			</div>
			<span
				data-aos='fade-right'
				data-aos-offset='200'
				data-aos-duration='500'
			>
				{type} ⦿ {year}
			</span>
			<h3
				data-aos='fade-right'
				data-aos-offset='200'
				data-aos-duration='500'
			>
				{name}
			</h3>
			<p
				data-aos='fade-right'
				data-aos-offset='200'
				data-aos-duration='500'
			>
				{' '}
				click to view{' '}
			</p>
		</Link>
	);
};

export default memo(Project);
