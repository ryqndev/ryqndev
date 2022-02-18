import clsx from 'clsx';
import { memo } from 'react';
import cn from './BackgroundText.module.scss';

function BackgroundText({ y }) {
	return (
		<div className={clsx(cn.container, y > window.innerHeight/2 && cn.visible)}>
			ryan
			<br />
			yang
		</div>
	);
}

export default memo(BackgroundText);
