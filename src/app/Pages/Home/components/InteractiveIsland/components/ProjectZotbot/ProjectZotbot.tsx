import { Html } from '@react-three/drei';
import cn from './ProjectZotbot.module.scss';
import { ActionList } from '../../../ActionList/ActionList';

interface ProjectBallProps {
    data: any;
    selected: boolean;
}

export function ProjectZotbot({ data, selected }: ProjectBallProps) {
    return (
        window.innerWidth > 768 && (
            <Html className={cn.container}>
                <ActionList data={data} selected={selected} />
            </Html>
        )
    );
}
