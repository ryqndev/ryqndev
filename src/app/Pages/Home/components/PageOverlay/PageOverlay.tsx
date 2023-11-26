import clsx from 'clsx';
import cn from './PageOverlay.module.scss';

interface PageOverlayProps {
    visible: boolean;
    className?: string;
    pages: any;
    project: any;
    setProject: any;
}

export function PageOverlay({
    visible,
    className,
    pages,
    project,
    setProject,
}: PageOverlayProps) {
    return (
        <div className={clsx(cn.container, className, visible && cn.visible)}>
            {pages.map((page: any, index: number) => (
                <div
                    className={clsx(project === index && cn.selected, cn.item)}
                    onClick={() => setProject(index)}
                    key={index}
                >
                    <span
                        data-mouse-hover="button"
                        data-mouse-hover-text="scroll to project"
                    >
                        {project === index ? '0' + (index + 1) : page.name}
                    </span>
                    <svg className={cn.icon} viewBox="0 0 14 14" fill="none">
                        {project === index && (
                            <rect width="14" height="14" rx="7" />
                        )}
                    </svg>
                </div>
            ))}
        </div>
    );
}
