import clsx from 'clsx';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import LaunchIcon from '@assets/icons/launch.svg?react';
import cn from './ActionList.module.scss';

interface ActionListProps {
    data: any;
    selected: boolean;
    className?: string;
    selectedClassName?: string;
}

interface ProjectLink {
    title: string;
    url: string;
    internal?: boolean;
}

export function ActionList({
    data,
    selected,
    className,
    selectedClassName,
}: ActionListProps) {
    const { t } = useTranslation();

    return (
        <div
            className={clsx(
                cn.container,
                className,
                selected && cn.selected,
                selected && selectedClassName
            )}
        >
            <div className={cn.content}>
                {data?.image && <img src={data.image.src} alt={data.alt} />}
                {data.links.map((link: ProjectLink) => (
                    <a
                        key={link.title}
                        target="_blank"
                        rel="noopener noreferrer"
                        href={link.url}
                        className={cn.item}
                        data-mouse-hover="link"
                        data-mouse-hover-text="open link in new tab"
                    >
                        {t(link.title)}
                        {!link?.internal && <LaunchIcon />}
                    </a>
                ))}
            </div>
        </div>
    );
}

export default memo(ActionList);
