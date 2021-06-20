import { memo } from 'react';
import { ReactComponent as ChineseName } from '../../assets/chinese.svg';
import cn from './Footer.module.scss';

const Footer = () => {
	return (
		<footer className={cn.wrapper}>
			<div className={cn.background}>
				<ChineseName />
				<div className={cn['made-with--note']}>
					Made with{' '}
					<span role='img' aria-label='love'>
						❤️
					</span>{' '}
					in irvine on sbux{' '}
					<span role='img' aria-label='coffee'>
						☕
					</span>{' '}
					& boba
				</div>
			</div>
			
		</footer>
	);
};

export default memo(Footer);
