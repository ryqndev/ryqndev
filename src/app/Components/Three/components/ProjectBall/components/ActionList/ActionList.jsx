import clsx from 'clsx';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Html } from '@react-three/drei';
import { ReactComponent as LaunchIcon } from '../../../../../../assets/icons/launch.svg';
import cn from './ActionList.module.scss';

function ActionList({ data, selected }) {
	const { t } = useTranslation();

	return (
		<Html className={clsx(cn.container, selected && cn.selected)}>
			<div className={cn.content}>
				{data?.image && <img src={data.image.src} alt={data.alt} />}
				{data.links.map(link => (
					<a
						key={link.title}
						target='_blank'
						rel='noopener noreferrer'
						href={link.url}
						className={cn.item}
					>
						{t(link.title)}
						{!link?.internal && <LaunchIcon />}
					</a>
				))}
			</div>
		</Html>
	);
}

export default memo(ActionList);
