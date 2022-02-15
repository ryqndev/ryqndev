import { memo } from 'react';
import { useScroll } from '../../controller';
import { Curtain, Timeline } from './components';
import cn from './Home.module.scss';

const Home = () => {
	const { y } = useScroll();

	return (
		<main className={cn.container}>
			<div className={cn.header}>
				{y < (window.innerHeight * 1.5) && <Curtain y={y} />}
			</div>
			<div className={cn.content}>
				<Timeline />
			</div>
		</main>
	);
};

export default memo(Home);
