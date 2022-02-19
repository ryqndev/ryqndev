import clsx from 'clsx';
import { memo } from 'react';
import { Html } from '@react-three/drei';
import { ReactComponent as LaunchIcon } from '../../../../../../assets/icons/launch.svg';
import cn from './ActionList.module.scss';

function ActionList({ data, selected }) {
	return (
		<Html className={clsx(cn.container, selected && cn.selected)}>
			<div className={cn.content}>
				{data.links.map(link => (
					<a
                        key={link.title}
						target='_blank'
						rel='noopener noreferrer'
						href={link.url}
						className={cn.item}
					>
						{link.title}
						{!link?.internal && <LaunchIcon /> }
					</a>
				))}
			</div>
		</Html>
	);
}

export default memo(ActionList);
