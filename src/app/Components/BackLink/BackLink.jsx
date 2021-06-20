import { memo } from 'react';
import { ReactComponent as BackArrow } from '../../assets/icons/arrow.svg';
import { Link } from 'react-router-dom';
import './BackLink.scss';

const BackLink = ({ to = '/', pageName = '' }) => {

	return (
		<div className='back-link--wrapper'>
			<Link to={to}>
				<BackArrow /> <span>back to {pageName} </span>
			</Link>
		</div>
	);
};

export default memo(BackLink);
